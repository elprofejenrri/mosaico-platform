from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest
import httpx
from cryptography.fernet import Fernet

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from google_calendar_service import (  # noqa: E402
    GOOGLE_CALENDAR_SCOPES,
    GoogleCalendarConfig,
    GoogleCalendarError,
    GoogleCalendarService,
    TokenCipher,
    interval_conflicts,
    is_retryable_response,
    local_time_window,
    mask_email,
    normalize_intervals,
    safe_return_url,
    scopes_sufficient,
)


def test_scopes_are_limited_to_calendar_selection_freebusy_and_owned_events():
    assert "https://www.googleapis.com/auth/calendar" not in GOOGLE_CALENDAR_SCOPES
    assert "https://www.googleapis.com/auth/calendar.readonly" not in GOOGLE_CALENDAR_SCOPES
    assert (
        "https://www.googleapis.com/auth/calendar.events.freebusy"
        in GOOGLE_CALENDAR_SCOPES
    )
    assert (
        "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
        in GOOGLE_CALENDAR_SCOPES
    )
    assert "https://www.googleapis.com/auth/calendar.events.owned" in GOOGLE_CALENDAR_SCOPES
    assert not any("gmail" in scope or "drive" in scope for scope in GOOGLE_CALENDAR_SCOPES)


def test_scope_validation_accepts_google_canonical_email_alias():
    granted = {
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        "https://www.googleapis.com/auth/calendar.events.freebusy",
        "https://www.googleapis.com/auth/calendar.events.owned",
    }
    assert scopes_sufficient(granted) is True
    granted.remove("https://www.googleapis.com/auth/calendar.events.owned")
    assert scopes_sufficient(granted) is False


def test_mask_email_does_not_return_full_local_part():
    assert mask_email("teacher@example.com") == "te*****@example.com"
    assert mask_email("x@example.com") == "x**@example.com"
    assert mask_email("invalid") == ""


def test_normalize_intervals_merges_overlap_and_contiguous_ranges():
    result = normalize_intervals(
        [
            {"start": "2026-07-23T10:30:00+00:00", "end": "2026-07-23T11:00:00+00:00"},
            {"start": "2026-07-23T10:00:00+00:00", "end": "2026-07-23T10:30:00+00:00"},
            {"start": "2026-07-23T10:15:00+00:00", "end": "2026-07-23T10:45:00+00:00"},
        ]
    )
    assert result == [
        {"start": "2026-07-23T10:00:00+00:00", "end": "2026-07-23T11:00:00+00:00"}
    ]


def test_normalize_intervals_drops_invalid_ranges():
    assert normalize_intervals(
        [{"start": "2026-07-23T11:00:00Z", "end": "2026-07-23T10:00:00Z"}]
    ) == []


@pytest.mark.parametrize(
    ("slot_start", "slot_end", "expected"),
    [
        ("2026-07-23T09:00:00Z", "2026-07-23T10:00:00Z", False),
        ("2026-07-23T09:30:00Z", "2026-07-23T10:30:00Z", True),
        ("2026-07-23T10:00:00Z", "2026-07-23T11:00:00Z", True),
        ("2026-07-23T11:00:00Z", "2026-07-23T12:00:00Z", False),
    ],
)
def test_interval_conflict_rules(slot_start, slot_end, expected):
    blocks = [{"start": "2026-07-23T10:00:00Z", "end": "2026-07-23T11:00:00Z"}]
    assert interval_conflicts(
        datetime.fromisoformat(slot_start.replace("Z", "+00:00")),
        datetime.fromisoformat(slot_end.replace("Z", "+00:00")),
        blocks,
    ) is expected


def test_local_time_window_converts_iana_timezone_to_utc():
    start, end = local_time_window(
        "2026-07-23", "09:00", 60, "America/Cancun"
    )
    assert start == datetime(2026, 7, 23, 14, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 7, 23, 15, 0, tzinfo=timezone.utc)


def test_local_time_window_rejects_ambiguous_dst_time():
    with pytest.raises(ValueError, match="ambiguous"):
        local_time_window("2026-11-01", "01:30", 60, "America/New_York")


def test_local_time_window_rejects_nonexistent_dst_time():
    with pytest.raises(ValueError, match="invalid"):
        local_time_window("2026-03-08", "02:30", 60, "America/New_York")


def test_token_cipher_round_trip_and_wrong_key_rejection():
    first = TokenCipher(Fernet.generate_key().decode("ascii"))
    second = TokenCipher(Fernet.generate_key().decode("ascii"))
    encrypted = first.encrypt("refresh-secret")
    assert encrypted != "refresh-secret"
    assert first.decrypt(encrypted) == "refresh-secret"
    with pytest.raises(GoogleCalendarError) as caught:
        second.decrypt(encrypted)
    assert caught.value.code == "calendar_credentials_unreadable"


def test_config_fails_closed_without_required_secrets(monkeypatch):
    for name in (
        "GOOGLE_CALENDAR_CLIENT_ID",
        "GOOGLE_CALENDAR_CLIENT_SECRET",
        "GOOGLE_CALENDAR_REDIRECT_URI",
        "GOOGLE_CALENDAR_ENCRYPTION_KEY",
        "GOOGLE_CALENDAR_STATE_SECRET",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("GOOGLE_CALENDAR_INTEGRATION_ENABLED", "true")
    config = GoogleCalendarConfig.from_env()
    assert config.ready is False
    assert "GOOGLE_CALENDAR_CLIENT_SECRET" in config.missing


def test_google_403_rate_limit_is_retryable_but_permission_denial_is_not():
    request = httpx.Request("GET", "https://www.googleapis.com/calendar/v3/test")
    rate_limit = httpx.Response(
        403,
        request=request,
        json={"error": {"errors": [{"reason": "rateLimitExceeded"}]}},
    )
    denied = httpx.Response(
        403,
        request=request,
        json={"error": {"errors": [{"reason": "forbidden"}]}},
    )
    assert is_retryable_response(rate_limit) is True
    assert is_retryable_response(denied) is False


def test_return_url_contains_only_safe_result_code():
    value = safe_return_url(
        "https://app.example/teacher/calendar",
        "error",
        "calendar_consent_denied",
    )
    assert value == (
        "https://app.example/teacher/calendar"
        "?calendar=error&code=calendar_consent_denied"
    )


def test_event_body_is_generic_and_contains_no_student_data():
    booking = {
        "starts_at": datetime(2026, 7, 23, 14, 0, tzinfo=timezone.utc),
        "ends_at": datetime(2026, 7, 23, 15, 0, tzinfo=timezone.utc),
        "timezone": "America/Cancun",
        "language": "Spanish",
        "user_name": "Private Student",
        "user_email": "private@example.com",
        "notes": "private note",
    }
    body = GoogleCalendarService._event_body(booking, "m12345")
    serialized = str(body)
    assert body["summary"] == "MOSAICO class · Spanish"
    assert "Private Student" not in serialized
    assert "private@example.com" not in serialized
    assert "private note" not in serialized
    assert body["extendedProperties"]["private"]["managedBy"] == "mosaico"


def test_event_id_is_stable_and_google_compatible():
    first = GoogleCalendarService._event_key("booking-1", "teacher-1")
    second = GoogleCalendarService._event_key("booking-1", "teacher-1")
    other = GoogleCalendarService._event_key("booking-2", "teacher-1")
    assert first == second
    assert first != other
    assert first.startswith("m")
    assert first.isalnum()
