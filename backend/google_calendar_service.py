"""Per-teacher Google Calendar integration for MOSAICO.

The service deliberately uses Google's HTTP APIs directly so tokens stay on the
backend.  HTTP handlers and MOSAICO authorization live in ``server.py``.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import random
import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote, urlencode
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
import jwt
from cryptography.fernet import Fernet, InvalidToken


AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
CALENDAR_API = "https://www.googleapis.com/calendar/v3"

GOOGLE_CALENDAR_SCOPES = (
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    "https://www.googleapis.com/auth/calendar.events.freebusy",
    "https://www.googleapis.com/auth/calendar.events.owned",
)
REQUIRED_CALENDAR_SCOPES = {
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    "https://www.googleapis.com/auth/calendar.events.freebusy",
    "https://www.googleapis.com/auth/calendar.events.owned",
}
EMAIL_SCOPE_ALIASES = {
    "email",
    "https://www.googleapis.com/auth/userinfo.email",
}

RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}
RETRYABLE_GOOGLE_REASONS = {
    "rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded"
}
ALLOWED_ACCESS_ROLES = {"freeBusyReader", "reader", "writer", "owner"}
WRITABLE_ACCESS_ROLES = {"owner"}
SYNC_STATUSES = {
    "pending", "synced", "retrying", "failed", "disconnected", "conflict", "cancelled"
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def parse_utc(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def mask_email(email: str) -> str:
    local, separator, domain = (email or "").partition("@")
    if not separator:
        return ""
    shown = local[:2] if len(local) > 1 else local[:1]
    return f"{shown}{'*' * max(2, min(8, len(local) - len(shown)))}@{domain}"


def normalize_intervals(intervals: list[dict[str, str]]) -> list[dict[str, str]]:
    """Sort and merge overlapping/contiguous busy intervals without event data."""
    parsed: list[tuple[datetime, datetime]] = []
    for item in intervals:
        start = parse_utc(item.get("start"))
        end = parse_utc(item.get("end"))
        if start and end and end > start:
            parsed.append((start, end))
    parsed.sort(key=lambda item: item[0])
    merged: list[list[datetime]] = []
    for start, end in parsed:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return [{"start": iso_utc(start), "end": iso_utc(end)} for start, end in merged]


def interval_conflicts(
    starts_at: datetime,
    ends_at: datetime,
    busy_blocks: list[dict[str, Any]],
) -> bool:
    start = starts_at.astimezone(timezone.utc)
    end = ends_at.astimezone(timezone.utc)
    return any(
        (busy_start := parse_utc(item.get("starts_at") or item.get("start")))
        and (busy_end := parse_utc(item.get("ends_at") or item.get("end")))
        and start < busy_end
        and end > busy_start
        for item in busy_blocks
    )


def local_time_window(
    date_value: str,
    time_value: str,
    duration_minutes: int,
    timezone_name: str,
) -> tuple[datetime, datetime]:
    """Resolve a local wall time and reject invalid/ambiguous DST instants."""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(date_value or "")):
        raise ValueError("date must use YYYY-MM-DD")
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", str(time_value or "")):
        raise ValueError("time must use HH:MM")
    if duration_minutes < 1 or duration_minutes > 480:
        raise ValueError("duration is out of range")
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError("timezone must be a valid IANA name") from exc
    naive = datetime.fromisoformat(f"{date_value}T{time_value}:00")
    candidates: dict[datetime, datetime] = {}
    for fold in (0, 1):
        aware = naive.replace(tzinfo=zone, fold=fold)
        utc_value = aware.astimezone(timezone.utc)
        if utc_value.astimezone(zone).replace(tzinfo=None) == naive:
            candidates[utc_value] = aware
    if len(candidates) != 1:
        raise ValueError("local time is invalid or ambiguous because of daylight saving time")
    start = next(iter(candidates)).astimezone(timezone.utc)
    return start, start + timedelta(minutes=duration_minutes)


def safe_return_url(configured_url: str, result: str, code: str = "") -> str:
    separator = "&" if "?" in configured_url else "?"
    values = {"calendar": result}
    if code:
        values["code"] = code
    return f"{configured_url}{separator}{urlencode(values)}"


def is_retryable_response(response: httpx.Response) -> bool:
    if response.status_code in RETRYABLE_STATUS_CODES:
        return True
    if response.status_code != 403:
        return False
    try:
        reasons = {
            item.get("reason")
            for item in (response.json().get("error", {}).get("errors") or [])
        }
    except (ValueError, AttributeError):
        return False
    return bool(reasons & RETRYABLE_GOOGLE_REASONS)


def scopes_sufficient(granted: set[str]) -> bool:
    return (
        "openid" in granted
        and bool(granted & EMAIL_SCOPE_ALIASES)
        and REQUIRED_CALENDAR_SCOPES.issubset(granted)
    )


@dataclass(frozen=True)
class GoogleCalendarConfig:
    enabled: bool
    client_id: str
    client_secret: str
    redirect_uri: str
    frontend_return_url: str
    encryption_key: str
    state_secret: str
    sync_window_days: int = 60
    cache_ttl_seconds: int = 300
    request_timeout_seconds: float = 12.0
    max_retries: int = 3

    @classmethod
    def from_env(cls) -> "GoogleCalendarConfig":
        def integer(name: str, default: int, minimum: int, maximum: int) -> int:
            try:
                return max(minimum, min(maximum, int(os.getenv(name, str(default)))))
            except ValueError:
                return default

        def decimal(name: str, default: float, minimum: float, maximum: float) -> float:
            try:
                return max(minimum, min(maximum, float(os.getenv(name, str(default)))))
            except ValueError:
                return default

        return cls(
            enabled=os.getenv("GOOGLE_CALENDAR_INTEGRATION_ENABLED", "false").lower()
            in {"1", "true", "yes"},
            client_id=os.getenv("GOOGLE_CALENDAR_CLIENT_ID", "").strip(),
            client_secret=os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET", "").strip(),
            redirect_uri=os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "").strip(),
            frontend_return_url=os.getenv(
                "GOOGLE_CALENDAR_FRONTEND_RETURN_URL",
                "http://localhost:3000/teacher/calendar",
            ).strip(),
            encryption_key=os.getenv("GOOGLE_CALENDAR_ENCRYPTION_KEY", "").strip(),
            state_secret=os.getenv("GOOGLE_CALENDAR_STATE_SECRET", "").strip(),
            sync_window_days=integer("GOOGLE_CALENDAR_SYNC_WINDOW_DAYS", 60, 1, 90),
            cache_ttl_seconds=integer("GOOGLE_CALENDAR_CACHE_TTL_SECONDS", 300, 30, 3600),
            request_timeout_seconds=decimal(
                "GOOGLE_CALENDAR_REQUEST_TIMEOUT_SECONDS", 12.0, 2.0, 30.0
            ),
            max_retries=integer("GOOGLE_CALENDAR_MAX_RETRIES", 3, 0, 5),
        )

    @property
    def missing(self) -> list[str]:
        required = {
            "GOOGLE_CALENDAR_CLIENT_ID": self.client_id,
            "GOOGLE_CALENDAR_CLIENT_SECRET": self.client_secret,
            "GOOGLE_CALENDAR_REDIRECT_URI": self.redirect_uri,
            "GOOGLE_CALENDAR_FRONTEND_RETURN_URL": self.frontend_return_url,
            "GOOGLE_CALENDAR_ENCRYPTION_KEY": self.encryption_key,
            "GOOGLE_CALENDAR_STATE_SECRET": self.state_secret,
        }
        missing = [name for name, value in required.items() if not value]
        if self.encryption_key:
            try:
                Fernet(self.encryption_key.encode("ascii"))
            except (ValueError, TypeError):
                missing.append("GOOGLE_CALENDAR_ENCRYPTION_KEY(valid Fernet key)")
        if self.redirect_uri and not self.redirect_uri.startswith("https://"):
            if not self.redirect_uri.startswith("http://localhost"):
                missing.append("GOOGLE_CALENDAR_REDIRECT_URI(https)")
        if (
            self.frontend_return_url
            and not self.frontend_return_url.startswith("https://")
            and not self.frontend_return_url.startswith("http://localhost")
        ):
            missing.append("GOOGLE_CALENDAR_FRONTEND_RETURN_URL(https)")
        return missing

    @property
    def ready(self) -> bool:
        return self.enabled and not self.missing


class GoogleCalendarError(RuntimeError):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 502,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.retryable = retryable


class TokenCipher:
    def __init__(self, key: str):
        try:
            self._fernet = Fernet(key.encode("ascii"))
        except (ValueError, TypeError) as exc:
            raise GoogleCalendarError(
                "calendar_configuration_invalid",
                "Calendar token encryption is not configured correctly.",
                status_code=503,
            ) from exc

    def encrypt(self, token: str) -> str:
        return self._fernet.encrypt(token.encode("utf-8")).decode("ascii")

    def decrypt(self, encrypted: str) -> str:
        try:
            return self._fernet.decrypt(encrypted.encode("ascii")).decode("utf-8")
        except (InvalidToken, ValueError, TypeError) as exc:
            raise GoogleCalendarError(
                "calendar_credentials_unreadable",
                "Calendar credentials require reconnection.",
                status_code=409,
            ) from exc


class GoogleCalendarService:
    def __init__(self, db: Any, config: Optional[GoogleCalendarConfig] = None):
        self.db = db
        self.config = config or GoogleCalendarConfig.from_env()

    def require_ready(self) -> None:
        if not self.config.enabled:
            raise GoogleCalendarError(
                "calendar_feature_disabled",
                "Google Calendar integration is disabled.",
                status_code=404,
            )
        if self.config.missing:
            raise GoogleCalendarError(
                "calendar_not_configured",
                "Google Calendar integration is not configured.",
                status_code=503,
            )

    @property
    def cipher(self) -> TokenCipher:
        self.require_ready()
        return TokenCipher(self.config.encryption_key)

    async def create_authorization_url(self, user_id: str) -> str:
        self.require_ready()
        now = utc_now()
        nonce = secrets.token_urlsafe(32)
        nonce_hash = hashlib.sha256(nonce.encode("utf-8")).hexdigest()
        expires = now + timedelta(minutes=10)
        state_id = f"gcs_{uuid.uuid4().hex}"
        state = jwt.encode(
            {
                "sub": user_id,
                "jti": state_id,
                "nonce": nonce,
                "aud": "mosaico-google-calendar",
                "iat": int(now.timestamp()),
                "exp": int(expires.timestamp()),
            },
            self.config.state_secret,
            algorithm="HS256",
        )
        await self.db.google_calendar_oauth_states.insert_one(
            {
                "id": state_id,
                "user_id": user_id,
                "nonce_hash": nonce_hash,
                "expires_at": iso_utc(expires),
                "used_at": None,
                "created_at": iso_utc(now),
            }
        )
        return f"{AUTH_URL}?{urlencode({
            'client_id': self.config.client_id,
            'redirect_uri': self.config.redirect_uri,
            'response_type': 'code',
            'scope': ' '.join(GOOGLE_CALENDAR_SCOPES),
            'access_type': 'offline',
            'include_granted_scopes': 'true',
            'prompt': 'consent select_account',
            'state': state,
        })}"

    async def consume_state(self, state: str) -> str:
        self.require_ready()
        try:
            claims = jwt.decode(
                state,
                self.config.state_secret,
                algorithms=["HS256"],
                audience="mosaico-google-calendar",
                options={"require": ["sub", "jti", "nonce", "iat", "exp"]},
            )
        except jwt.PyJWTError as exc:
            raise GoogleCalendarError(
                "calendar_oauth_state_invalid",
                "Calendar authorization could not be verified.",
                status_code=400,
            ) from exc
        nonce_hash = hashlib.sha256(claims["nonce"].encode("utf-8")).hexdigest()
        async with self.db._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE google_calendar_oauth_states
                SET used_at = $1
                WHERE id = $2 AND user_id = $3 AND nonce_hash = $4
                  AND used_at IS NULL AND expires_at::timestamptz > $1::timestamptz
                RETURNING user_id
                """,
                iso_utc(utc_now()),
                claims["jti"],
                claims["sub"],
                nonce_hash,
            )
        if not row:
            raise GoogleCalendarError(
                "calendar_oauth_state_used",
                "Calendar authorization has expired or was already used.",
                status_code=409,
            )
        return str(row["user_id"])

    async def _request(
        self,
        method: str,
        url: str,
        *,
        headers: Optional[dict[str, str]] = None,
        params: Optional[dict[str, Any]] = None,
        data: Optional[dict[str, Any]] = None,
        json_body: Optional[dict[str, Any]] = None,
        retry: bool = True,
    ) -> httpx.Response:
        attempts = self.config.max_retries + 1 if retry else 1
        last_response: Optional[httpx.Response] = None
        for attempt in range(attempts):
            try:
                async with httpx.AsyncClient(
                    timeout=self.config.request_timeout_seconds
                ) as client:
                    response = await client.request(
                        method,
                        url,
                        headers=headers,
                        params=params,
                        data=data,
                        json=json_body,
                    )
                last_response = response
                if not is_retryable_response(response):
                    return response
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == attempts - 1:
                    raise GoogleCalendarError(
                        "calendar_provider_unavailable",
                        "Google Calendar is temporarily unavailable.",
                        status_code=503,
                        retryable=True,
                    )
            if attempt < attempts - 1:
                await asyncio.sleep(min(4.0, (2**attempt) * 0.25 + random.random() * 0.15))
        assert last_response is not None
        return last_response

    @staticmethod
    def _provider_error(response: httpx.Response, operation: str) -> GoogleCalendarError:
        status = response.status_code
        if is_retryable_response(response):
            return GoogleCalendarError(
                "calendar_provider_unavailable",
                "Google Calendar is temporarily unavailable.",
                status_code=503,
                retryable=True,
            )
        if status == 401:
            return GoogleCalendarError(
                "calendar_reconnect_required",
                "Google Calendar authorization has expired or was revoked.",
                status_code=409,
            )
        if status == 403:
            return GoogleCalendarError(
                "calendar_permission_denied",
                f"Google denied the calendar {operation}.",
                status_code=409,
            )
        if status == 404:
            return GoogleCalendarError(
                "calendar_not_found",
                "The selected Google calendar is no longer available.",
                status_code=409,
            )
        return GoogleCalendarError(
            "calendar_provider_error",
            f"Google Calendar could not complete {operation}.",
            status_code=502,
        )

    async def complete_authorization(self, user_id: str, code: str) -> dict[str, Any]:
        response = await self._request(
            "POST",
            TOKEN_URL,
            data={
                "code": code,
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "redirect_uri": self.config.redirect_uri,
                "grant_type": "authorization_code",
            },
            retry=False,
        )
        if response.status_code != 200:
            raise self._provider_error(response, "authorization")
        tokens = response.json()
        access_token = str(tokens.get("access_token") or "")
        if not access_token:
            raise GoogleCalendarError(
                "calendar_token_missing",
                "Google did not return a usable access token.",
                status_code=409,
            )
        granted = set(str(tokens.get("scope") or "").split())
        if not scopes_sufficient(granted):
            raise GoogleCalendarError(
                "calendar_scopes_incomplete",
                "Required Google Calendar permissions were not granted.",
                status_code=409,
            )
        identity_response = await self._request(
            "GET",
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            retry=False,
        )
        if identity_response.status_code != 200:
            raise self._provider_error(identity_response, "account verification")
        identity = identity_response.json()
        provider_account_id = str(identity.get("sub") or "")
        provider_email = str(identity.get("email") or "")
        if not provider_account_id:
            raise GoogleCalendarError(
                "calendar_account_unverified",
                "The connected Google account could not be identified.",
                status_code=409,
            )

        now = utc_now()
        existing = await self.db.external_calendar_connections.find_one(
            {"user_id": user_id, "provider": "google"}, {"_id": 0}
        )
        refresh_token = str(tokens.get("refresh_token") or "")
        same_provider_account = bool(
            existing
            and existing.get("provider_account_id") == provider_account_id
        )
        if (
            not refresh_token
            and same_provider_account
            and existing.get("refresh_token_encrypted")
        ):
            refresh_encrypted = existing["refresh_token_encrypted"]
        elif refresh_token:
            refresh_encrypted = self.cipher.encrypt(refresh_token)
        else:
            raise GoogleCalendarError(
                "calendar_refresh_token_missing",
                "Google did not return offline access. Reconnect and approve consent.",
                status_code=409,
            )
        connection_id = (existing or {}).get("id") or f"gcc_{uuid.uuid4().hex}"
        record = {
            "id": connection_id,
            "user_id": user_id,
            "provider": "google",
            "provider_account_id": provider_account_id,
            "provider_email_masked": mask_email(provider_email),
            "status": "connected",
            "granted_scopes": sorted(granted),
            "access_token_encrypted": self.cipher.encrypt(access_token),
            "refresh_token_encrypted": refresh_encrypted,
            "token_expires_at": iso_utc(
                now + timedelta(seconds=max(30, int(tokens.get("expires_in") or 3600)))
            ),
            "connected_at": iso_utc(now),
            "last_successful_sync_at": None,
            "last_sync_attempt_at": None,
            "last_sync_status": "pending",
            "last_sync_error_code": None,
            "busy_cache_start_at": None,
            "busy_cache_end_at": None,
            "revoked_at": None,
            "created_at": (existing or {}).get("created_at") or iso_utc(now),
            "updated_at": iso_utc(now),
        }
        if existing:
            await self.db.external_calendar_connections.update_one(
                {"id": connection_id}, {"$set": record}
            )
        else:
            await self.db.external_calendar_connections.insert_one(record)
        if existing and not same_provider_account:
            await self.db.external_calendar_selections.delete_many(
                {"connection_id": connection_id}
            )
            await self.db.external_busy_blocks.delete_many(
                {"connection_id": connection_id}
            )
        return self.public_connection(record)

    @staticmethod
    def public_connection(connection: Optional[dict[str, Any]]) -> dict[str, Any]:
        if not connection:
            return {
                "connected": False,
                "status": "not_connected",
                "account": "",
                "selectedBusyCalendars": [],
                "destinationCalendar": None,
                "lastSuccessfulSyncAt": None,
                "lastSyncAttemptAt": None,
                "lastSyncStatus": None,
                "lastSyncErrorCode": None,
                "futureSyncedClassCount": 0,
            }
        return {
            "connected": connection.get("status") == "connected",
            "status": connection.get("status") or "not_connected",
            "account": connection.get("provider_email_masked") or "",
            "lastSuccessfulSyncAt": connection.get("last_successful_sync_at"),
            "lastSyncAttemptAt": connection.get("last_sync_attempt_at"),
            "lastSyncStatus": connection.get("last_sync_status"),
            "lastSyncErrorCode": connection.get("last_sync_error_code"),
        }

    async def connection_for_user(self, user_id: str) -> Optional[dict[str, Any]]:
        return await self.db.external_calendar_connections.find_one(
            {"user_id": user_id, "provider": "google"}, {"_id": 0}
        )

    async def status(self, user_id: str) -> dict[str, Any]:
        connection = await self.connection_for_user(user_id)
        public = self.public_connection(connection)
        public.update(
            {
                "featureEnabled": self.config.enabled,
                "configured": not self.config.missing,
                "selectedBusyCalendars": [],
                "destinationCalendar": None,
            }
        )
        if not connection:
            return public
        async with self.db._pool.acquire() as conn:
            public["futureSyncedClassCount"] = int(
                await conn.fetchval(
                    """
                    SELECT COUNT(*)
                    FROM calendar_event_links link
                    JOIN bookings booking ON booking.id = link.class_id
                    WHERE link.teacher_user_id = $1
                      AND link.sync_status = 'synced'
                      AND booking.status NOT IN ('cancelled', 'canceled')
                      AND (
                        booking.starts_at::timestamptz > now()
                        OR (booking.starts_at IS NULL
                            AND booking.scheduled_date >= current_date::text)
                      )
                    """,
                    user_id,
                )
                or 0
            )
        selections = await self.db.external_calendar_selections.find(
            {"connection_id": connection["id"]}, {"_id": 0}
        ).to_list(100)
        public["selectedBusyCalendars"] = [
            {
                "id": item["calendar_id"],
                "name": item.get("display_name") or "Google Calendar",
                "accessRole": item.get("access_role"),
            }
            for item in selections
            if item.get("use_for_busy")
        ]
        destination = next((item for item in selections if item.get("use_for_events")), None)
        if destination:
            public["destinationCalendar"] = {
                "id": destination["calendar_id"],
                "name": destination.get("display_name") or "Google Calendar",
                "accessRole": destination.get("access_role"),
            }
        return public

    async def _active_access_token(self, connection: dict[str, Any]) -> str:
        expires = parse_utc(connection.get("token_expires_at"))
        if expires and expires > utc_now() + timedelta(seconds=60):
            return self.cipher.decrypt(connection["access_token_encrypted"])
        refresh_token = self.cipher.decrypt(connection["refresh_token_encrypted"])
        response = await self._request(
            "POST",
            TOKEN_URL,
            data={
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            retry=False,
        )
        if response.status_code != 200:
            await self.db.external_calendar_connections.update_one(
                {"id": connection["id"]},
                {
                    "$set": {
                        "status": "reconnect_required",
                        "last_sync_status": "failed",
                        "last_sync_error_code": "calendar_reconnect_required",
                        "updated_at": iso_utc(utc_now()),
                    }
                },
            )
            raise self._provider_error(response, "token refresh")
        tokens = response.json()
        access_token = str(tokens.get("access_token") or "")
        if not access_token:
            raise GoogleCalendarError(
                "calendar_token_missing",
                "Google did not return a usable access token.",
                status_code=409,
            )
        expires_at = iso_utc(
            utc_now() + timedelta(seconds=max(30, int(tokens.get("expires_in") or 3600)))
        )
        await self.db.external_calendar_connections.update_one(
            {"id": connection["id"]},
            {
                "$set": {
                    "access_token_encrypted": self.cipher.encrypt(access_token),
                    "token_expires_at": expires_at,
                    "updated_at": iso_utc(utc_now()),
                }
            },
        )
        return access_token

    async def list_calendars(self, user_id: str) -> list[dict[str, Any]]:
        connection = await self.connection_for_user(user_id)
        if not connection or connection.get("status") != "connected":
            raise GoogleCalendarError(
                "calendar_not_connected",
                "Connect Google Calendar first.",
                status_code=409,
            )
        token = await self._active_access_token(connection)
        calendars: list[dict[str, Any]] = []
        page_token: Optional[str] = None
        while True:
            params = {
                "maxResults": 250,
                "minAccessRole": "freeBusyReader",
                "showDeleted": "false",
                "showHidden": "false",
            }
            if page_token:
                params["pageToken"] = page_token
            response = await self._request(
                "GET",
                f"{CALENDAR_API}/users/me/calendarList",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )
            if response.status_code != 200:
                raise self._provider_error(response, "calendar listing")
            payload = response.json()
            for item in payload.get("items") or []:
                role = item.get("accessRole")
                if role not in ALLOWED_ACCESS_ROLES or not item.get("id"):
                    continue
                display_name = str(
                    item.get("summaryOverride") or item.get("summary") or "Calendar"
                )[:160]
                calendars.append(
                    {
                        "id": str(item["id"]),
                        "name": display_name,
                        "primary": bool(item.get("primary")),
                        "accessRole": role,
                        "timeZone": str(item.get("timeZone") or "")[:80],
                        "canUseForBusy": True,
                        "canUseForEvents": role in WRITABLE_ACCESS_ROLES,
                    }
                )
            page_token = payload.get("nextPageToken")
            if not page_token:
                break
        calendars.sort(key=lambda item: (not item["primary"], item["name"].lower()))
        return calendars

    async def save_settings(
        self,
        user_id: str,
        busy_calendar_ids: list[str],
        destination_calendar_id: str,
    ) -> dict[str, Any]:
        if not busy_calendar_ids or len(busy_calendar_ids) > 20:
            raise GoogleCalendarError(
                "calendar_selection_invalid",
                "Select between 1 and 20 calendars for availability.",
                status_code=422,
            )
        if len(set(busy_calendar_ids)) != len(busy_calendar_ids):
            raise GoogleCalendarError(
                "calendar_selection_invalid",
                "Calendar selections must be unique.",
                status_code=422,
            )
        calendars = {item["id"]: item for item in await self.list_calendars(user_id)}
        if any(calendar_id not in calendars for calendar_id in busy_calendar_ids):
            raise GoogleCalendarError(
                "calendar_selection_invalid",
                "One or more selected calendars are not available to this account.",
                status_code=422,
            )
        destination = calendars.get(destination_calendar_id)
        if not destination or not destination["canUseForEvents"]:
            raise GoogleCalendarError(
                "calendar_destination_not_writable",
                "Select a calendar owned by the connected account for MOSAICO classes.",
                status_code=422,
            )
        connection = await self.connection_for_user(user_id)
        assert connection is not None
        now = iso_utc(utc_now())
        selected = set(busy_calendar_ids) | {destination_calendar_id}
        async with self.db._pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    "DELETE FROM external_calendar_selections WHERE connection_id = $1",
                    connection["id"],
                )
                for calendar_id in selected:
                    item = calendars[calendar_id]
                    await conn.execute(
                        """
                        INSERT INTO external_calendar_selections (
                            id, connection_id, calendar_id, display_name, access_role,
                            use_for_busy, use_for_events, created_at, updated_at
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
                        """,
                        f"gsel_{uuid.uuid4().hex}",
                        connection["id"],
                        calendar_id,
                        item["name"],
                        item["accessRole"],
                        calendar_id in busy_calendar_ids,
                        calendar_id == destination_calendar_id,
                        now,
                    )
        return await self.status(user_id)

    async def sync_busy(
        self,
        user_id: str,
        *,
        starts_at: Optional[datetime] = None,
        ends_at: Optional[datetime] = None,
    ) -> dict[str, Any]:
        connection = await self.connection_for_user(user_id)
        if not connection or connection.get("status") != "connected":
            raise GoogleCalendarError(
                "calendar_not_connected",
                "Connect Google Calendar first.",
                status_code=409,
            )
        selections = await self.db.external_calendar_selections.find(
            {"connection_id": connection["id"], "use_for_busy": True}, {"_id": 0}
        ).to_list(20)
        if not selections:
            raise GoogleCalendarError(
                "calendar_selection_required",
                "Select at least one calendar for availability.",
                status_code=409,
            )
        now = utc_now()
        start = (starts_at or now).astimezone(timezone.utc)
        max_end = now + timedelta(days=self.config.sync_window_days)
        end = min((ends_at or max_end).astimezone(timezone.utc), max_end)
        if end <= start:
            raise GoogleCalendarError(
                "calendar_window_invalid",
                "Calendar availability window is invalid.",
                status_code=422,
            )
        await self.db.external_calendar_connections.update_one(
            {"id": connection["id"]},
            {
                "$set": {
                    "last_sync_attempt_at": iso_utc(now),
                    "last_sync_status": "retrying",
                    "last_sync_error_code": None,
                    "updated_at": iso_utc(now),
                }
            },
        )
        try:
            token = await self._active_access_token(connection)
            response = await self._request(
                "POST",
                f"{CALENDAR_API}/freeBusy",
                headers={"Authorization": f"Bearer {token}"},
                json_body={
                    "timeMin": iso_utc(start),
                    "timeMax": iso_utc(end),
                    "items": [{"id": item["calendar_id"]} for item in selections],
                },
            )
            if response.status_code != 200:
                raise self._provider_error(response, "availability sync")
            payload = response.json()
            fetched_at = utc_now()
            expires_at = fetched_at + timedelta(seconds=self.config.cache_ttl_seconds)
            rows: list[dict[str, Any]] = []
            for selection in selections:
                calendar_id = selection["calendar_id"]
                calendar_payload = (payload.get("calendars") or {}).get(calendar_id) or {}
                if calendar_payload.get("errors"):
                    raise GoogleCalendarError(
                        "calendar_partial_sync_failed",
                        "One selected calendar could not be synchronized.",
                        status_code=503,
                        retryable=True,
                    )
                for interval in normalize_intervals(calendar_payload.get("busy") or []):
                    rows.append(
                        {
                            "id": f"gbb_{uuid.uuid4().hex}",
                            "connection_id": connection["id"],
                            "teacher_user_id": user_id,
                            "calendar_id": calendar_id,
                            "starts_at": interval["start"],
                            "ends_at": interval["end"],
                            "source": "google_freebusy",
                            "fetched_at": iso_utc(fetched_at),
                            "expires_at": iso_utc(expires_at),
                            "created_at": iso_utc(fetched_at),
                        }
                    )
            async with self.db._pool.acquire() as conn:
                async with conn.transaction():
                    await conn.execute(
                        """
                        DELETE FROM external_busy_blocks
                        WHERE connection_id = $1
                          AND starts_at::timestamptz < $3::timestamptz
                          AND ends_at::timestamptz > $2::timestamptz
                        """,
                        connection["id"],
                        iso_utc(start),
                        iso_utc(end),
                    )
                    for row in rows:
                        await conn.execute(
                            """
                            INSERT INTO external_busy_blocks (
                                id, connection_id, teacher_user_id, calendar_id,
                                starts_at, ends_at, source, fetched_at, expires_at, created_at
                            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                            ON CONFLICT (connection_id, calendar_id, starts_at, ends_at)
                            DO UPDATE SET fetched_at = EXCLUDED.fetched_at,
                                          expires_at = EXCLUDED.expires_at
                            """,
                            *[row[key] for key in (
                                "id", "connection_id", "teacher_user_id", "calendar_id",
                                "starts_at", "ends_at", "source", "fetched_at",
                                "expires_at", "created_at"
                            )],
                        )
            await self.db.external_calendar_connections.update_one(
                {"id": connection["id"]},
                {
                    "$set": {
                        "last_successful_sync_at": iso_utc(fetched_at),
                        "last_sync_status": "synced",
                        "last_sync_error_code": None,
                        "busy_cache_start_at": iso_utc(start),
                        "busy_cache_end_at": iso_utc(end),
                        "updated_at": iso_utc(fetched_at),
                    }
                },
            )
            return {
                "status": "synced",
                "fetchedAt": iso_utc(fetched_at),
                "expiresAt": iso_utc(expires_at),
                "blockCount": len(rows),
                "timeMin": iso_utc(start),
                "timeMax": iso_utc(end),
            }
        except GoogleCalendarError as exc:
            await self.db.external_calendar_connections.update_one(
                {"id": connection["id"]},
                {
                    "$set": {
                        "last_sync_status": "failed",
                        "last_sync_error_code": exc.code,
                        "updated_at": iso_utc(utc_now()),
                    }
                },
            )
            raise

    async def busy_blocks(
        self,
        user_id: str,
        starts_at: datetime,
        ends_at: datetime,
        *,
        require_fresh: bool,
    ) -> list[dict[str, str]]:
        connection = await self.connection_for_user(user_id)
        if not connection or connection.get("status") != "connected":
            return []
        last_sync = parse_utc(connection.get("last_successful_sync_at"))
        cache_start = parse_utc(connection.get("busy_cache_start_at"))
        cache_end = parse_utc(connection.get("busy_cache_end_at"))
        stale = (
            not last_sync
            or last_sync < utc_now() - timedelta(seconds=self.config.cache_ttl_seconds)
            or not cache_start
            or not cache_end
            or starts_at.astimezone(timezone.utc) < cache_start
            or ends_at.astimezone(timezone.utc) > cache_end
        )
        if require_fresh or stale:
            await self.sync_busy(user_id, starts_at=starts_at, ends_at=ends_at)
        async with self.db._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT starts_at, ends_at, fetched_at, expires_at
                FROM external_busy_blocks
                WHERE teacher_user_id = $1
                  AND starts_at::timestamptz < $3::timestamptz
                  AND ends_at::timestamptz > $2::timestamptz
                  AND expires_at::timestamptz > now()
                ORDER BY starts_at
                """,
                user_id,
                iso_utc(starts_at),
                iso_utc(ends_at),
            )
        return [
            {
                "start": str(row["starts_at"]),
                "end": str(row["ends_at"]),
                "label": "Occupied by external calendar",
                "source": "external",
                "fetchedAt": str(row["fetched_at"]),
                "expiresAt": str(row["expires_at"]),
            }
            for row in rows
        ]

    async def disconnect(self, user_id: str) -> dict[str, Any]:
        connection = await self.connection_for_user(user_id)
        if not connection:
            return self.public_connection(None)
        token = ""
        try:
            token = self.cipher.decrypt(connection.get("refresh_token_encrypted") or "")
        except GoogleCalendarError:
            token = ""
        if token:
            try:
                await self._request(
                    "POST",
                    REVOKE_URL,
                    data={"token": token},
                    retry=False,
                )
            except GoogleCalendarError:
                pass
        now = iso_utc(utc_now())
        await self.db.external_calendar_connections.update_one(
            {"id": connection["id"]},
            {
                "$set": {
                    "status": "revoked",
                    "access_token_encrypted": None,
                    "refresh_token_encrypted": None,
                    "token_expires_at": None,
                    "revoked_at": now,
                    "last_sync_status": "disconnected",
                    "last_sync_error_code": None,
                    "busy_cache_start_at": None,
                    "busy_cache_end_at": None,
                    "updated_at": now,
                }
            },
        )
        await self.db.external_busy_blocks.delete_many(
            {"connection_id": connection["id"]}
        )
        return self.public_connection(None)

    async def _destination(self, connection_id: str) -> dict[str, Any]:
        destination = await self.db.external_calendar_selections.find_one(
            {"connection_id": connection_id, "use_for_events": True}, {"_id": 0}
        )
        if not destination or destination.get("access_role") not in WRITABLE_ACCESS_ROLES:
            raise GoogleCalendarError(
                "calendar_destination_required",
                "Select an owned destination calendar for MOSAICO classes.",
                status_code=409,
            )
        return destination

    @staticmethod
    def _event_key(booking_id: str, teacher_user_id: str) -> str:
        digest = hashlib.sha256(
            f"{booking_id}:{teacher_user_id}".encode("utf-8")
        ).hexdigest()
        return f"m{digest}"

    @staticmethod
    def _event_body(booking: dict[str, Any], event_key: str) -> dict[str, Any]:
        start = booking["starts_at"]
        end = booking["ends_at"]
        timezone_name = booking.get("timezone") or "UTC"
        summary = "MOSAICO class"
        if booking.get("language"):
            summary = f"MOSAICO class · {str(booking['language'])[:20]}"
        description = "Manage changes from MOSAICO."
        location = str(booking.get("location") or "")[:500]
        body: dict[str, Any] = {
            "id": event_key,
            "summary": summary,
            "description": description,
            "start": {"dateTime": iso_utc(start), "timeZone": timezone_name},
            "end": {"dateTime": iso_utc(end), "timeZone": timezone_name},
            "extendedProperties": {
                "private": {"mosaicoEventKey": event_key, "managedBy": "mosaico"}
            },
            "reminders": {"useDefault": True},
        }
        if location:
            body["location"] = location
        return body

    async def sync_booking_event(
        self,
        teacher_user_id: str,
        booking: dict[str, Any],
        *,
        operation: str = "upsert",
    ) -> dict[str, Any]:
        connection = await self.connection_for_user(teacher_user_id)
        if not connection or connection.get("status") != "connected":
            return {"status": "disconnected"}
        destination = await self._destination(connection["id"])
        token = await self._active_access_token(connection)
        booking_id = str(booking["id"])
        event_key = self._event_key(booking_id, teacher_user_id)
        link = await self.db.calendar_event_links.find_one(
            {
                "class_id": booking_id,
                "teacher_user_id": teacher_user_id,
                "connection_id": connection["id"],
            },
            {"_id": 0},
        )
        now = iso_utc(utc_now())
        target_calendar_id = (
            (link or {}).get("calendar_id") or destination["calendar_id"]
        )
        if operation == "cancel":
            event_id = (link or {}).get("google_event_id") or event_key
            event_url = (
                f"{CALENDAR_API}/calendars/"
                f"{quote(target_calendar_id, safe='')}/events/"
                f"{quote(event_id, safe='')}"
            )
            response = await self._request(
                "DELETE",
                event_url,
                headers={"Authorization": f"Bearer {token}"},
                params={"sendUpdates": "none"},
            )
            if response.status_code not in {200, 204, 404, 410}:
                raise self._provider_error(response, "event cancellation")
            if link:
                await self.db.calendar_event_links.update_one(
                    {"id": link["id"]},
                    {
                        "$set": {
                            "sync_status": "cancelled",
                            "last_synced_at": now,
                            "last_error_code": None,
                            "updated_at": now,
                        }
                    },
                )
            return {"status": "cancelled"}

        body = self._event_body(booking, event_key)
        if link:
            event_id = link["google_event_id"]
            event_url = (
                f"{CALENDAR_API}/calendars/"
                f"{quote(target_calendar_id, safe='')}/events/"
                f"{quote(event_id, safe='')}"
            )
            response = await self._request(
                "PATCH",
                event_url,
                headers={"Authorization": f"Bearer {token}"},
                params={"sendUpdates": "none"},
                json_body={key: value for key, value in body.items() if key != "id"},
            )
            if response.status_code in {404, 410}:
                collection_url = (
                    f"{CALENDAR_API}/calendars/"
                    f"{quote(destination['calendar_id'], safe='')}/events"
                )
                target_calendar_id = destination["calendar_id"]
                response = await self._request(
                    "POST",
                    collection_url,
                    headers={"Authorization": f"Bearer {token}"},
                    params={"sendUpdates": "none"},
                    json_body=body,
                )
        else:
            response = await self._request(
                "POST",
                f"{CALENDAR_API}/calendars/{quote(destination['calendar_id'], safe='')}/events",
                headers={"Authorization": f"Bearer {token}"},
                params={"sendUpdates": "none"},
                json_body=body,
            )
            if response.status_code == 409:
                event_url = (
                    f"{CALENDAR_API}/calendars/"
                    f"{quote(destination['calendar_id'], safe='')}/events/{event_key}"
                )
                response = await self._request(
                    "PATCH",
                    event_url,
                    headers={"Authorization": f"Bearer {token}"},
                    params={"sendUpdates": "none"},
                    json_body={key: value for key, value in body.items() if key != "id"},
                )
        if response.status_code not in {200, 201}:
            raise self._provider_error(response, "event synchronization")
        event = response.json()
        record = {
            "id": (link or {}).get("id") or f"gel_{uuid.uuid4().hex}",
            "class_id": booking_id,
            "reservation_id": booking.get("reservation_id"),
            "teacher_user_id": teacher_user_id,
            "connection_id": connection["id"],
            "calendar_id": target_calendar_id,
            "google_event_id": str(event.get("id") or event_key),
            "google_event_etag": str(event.get("etag") or ""),
            "idempotency_key": event_key,
            "sync_status": "synced",
            "last_synced_at": now,
            "last_error_code": None,
            "created_at": (link or {}).get("created_at") or now,
            "updated_at": now,
        }
        if link:
            await self.db.calendar_event_links.update_one(
                {"id": link["id"]}, {"$set": record}
            )
        else:
            await self.db.calendar_event_links.insert_one(record)
        return {"status": "synced", "eventId": record["google_event_id"]}

    async def mark_event_failure(
        self,
        teacher_user_id: str,
        booking: dict[str, Any],
        error_code: str,
    ) -> None:
        connection = await self.connection_for_user(teacher_user_id)
        if not connection:
            return
        try:
            destination = await self._destination(connection["id"])
        except GoogleCalendarError:
            return
        booking_id = str(booking["id"])
        event_key = self._event_key(booking_id, teacher_user_id)
        existing = await self.db.calendar_event_links.find_one(
            {
                "class_id": booking_id,
                "teacher_user_id": teacher_user_id,
                "connection_id": connection["id"],
            },
            {"_id": 0},
        )
        now = iso_utc(utc_now())
        record = {
            "id": (existing or {}).get("id") or f"gel_{uuid.uuid4().hex}",
            "class_id": booking_id,
            "reservation_id": booking.get("reservation_id"),
            "teacher_user_id": teacher_user_id,
            "connection_id": connection["id"],
            "calendar_id": destination["calendar_id"],
            "google_event_id": (existing or {}).get("google_event_id") or event_key,
            "google_event_etag": (existing or {}).get("google_event_etag") or "",
            "idempotency_key": event_key,
            "sync_status": "retrying",
            "last_synced_at": (existing or {}).get("last_synced_at"),
            "last_error_code": error_code,
            "created_at": (existing or {}).get("created_at") or now,
            "updated_at": now,
        }
        if existing:
            await self.db.calendar_event_links.update_one(
                {"id": existing["id"]}, {"$set": record}
            )
        else:
            await self.db.calendar_event_links.insert_one(record)
