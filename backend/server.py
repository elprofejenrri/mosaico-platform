"""Lily Spanish — Backend API."""
import os
import uuid
import logging
import mimetypes
import json
import hashlib
import re
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx
import jwt
import stripe
from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends, UploadFile, File
from fastapi.responses import JSONResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import get_database, close_pool, Database
from rbac_policy import (
    PERMISSIONS as CANONICAL_PERMISSIONS,
    ROLE_DEFINITIONS,
    ROLE_GRANTS,
    ScopeContext,
    permission_allows,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

db: Optional[Database] = None

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_STORAGE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "mosaico")
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
LOCAL_AUTH_SESSION_MINUTES = int(os.environ.get("LOCAL_AUTH_SESSION_MINUTES") or os.environ.get("AUTH_SESSION_DURATION_MINUTES") or "10080")
LOCAL_AUTH_TOKEN_PREFIX = "mosaico_local_"
PASSWORD_HASH_ITERATIONS = 210_000

APP_NAME = "mosaico"
_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


def _has_real_supabase_storage_config() -> bool:
    placeholder_tokens = ("PROJECT_REF", "your-supabase", "placeholder")
    values = (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return all(values) and not any(
        token.lower() in value.lower()
        for value in values
        for token in placeholder_tokens
    )


def _is_placeholder(value: str) -> bool:
    return any(token in (value or "").lower() for token in ("project_ref", "your-supabase", "placeholder"))


def _dev_auth_enabled() -> bool:
    return os.environ.get("DEV_AUTH", "").lower() in ("1", "true", "yes") or _is_placeholder(SUPABASE_JWT_SECRET)


def _strict_production_guards_enabled() -> bool:
    return os.environ.get("MOSAICO_ENV", "").lower() == "production" or os.environ.get("APP_ENV", "").lower() == "production"


def _validate_production_config() -> None:
    if not _strict_production_guards_enabled():
        return
    if os.environ.get("DEV_AUTH", "").lower() in ("1", "true", "yes"):
        raise RuntimeError("DEV_AUTH cannot be enabled in production")
    if _is_placeholder(SUPABASE_JWT_SECRET) or _is_placeholder(SUPABASE_URL) or _is_placeholder(SUPABASE_ANON_KEY):
        raise RuntimeError("Supabase production configuration contains placeholder values")
    if not os.environ.get("CORS_ORIGINS"):
        raise RuntimeError("CORS_ORIGINS is required in production")


def _cors_origins() -> List[str]:
    configured = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip()]
    if configured:
        return configured
    return ["http://localhost:3000", "http://localhost:3001"]


def _require_supabase_storage() -> None:
    if not _has_real_supabase_storage_config():
        raise HTTPException(500, "Supabase storage is not configured")


def _storage_headers(content_type: Optional[str] = None) -> dict:
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


async def _ensure_storage_bucket() -> None:
    if not _has_real_supabase_storage_config():
        logger.info("Supabase storage not configured; uploads disabled")
        return
    async with httpx.AsyncClient(timeout=20.0) as hc:
        r = await hc.post(
            f"{SUPABASE_URL}/storage/v1/bucket",
            headers=_storage_headers("application/json"),
            json={"id": SUPABASE_STORAGE_BUCKET, "name": SUPABASE_STORAGE_BUCKET, "public": True},
        )
    if r.status_code not in (200, 201, 409) and "already exists" not in r.text.lower() and "duplicate" not in r.text.lower():
        logger.warning(f"Supabase storage bucket init failed: {r.status_code} {r.text[:200]}")


async def _put_object(path: str, data: bytes, content_type: str) -> dict:
    _require_supabase_storage()
    async with httpx.AsyncClient(timeout=120.0) as hc:
        r = await hc.post(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{path}",
            headers={**_storage_headers(content_type), "x-upsert": "false"},
            content=data,
        )
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Supabase storage upload failed: {r.text[:200]}")
    return {
        "path": path,
        "public_url": f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_STORAGE_BUCKET}/{path}",
        "size": len(data),
    }


async def _get_object(path: str):
    _require_supabase_storage()
    async with httpx.AsyncClient(timeout=60.0) as hc:
        r = await hc.get(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{path}",
            headers=_storage_headers(),
        )
    if r.status_code != 200:
        raise HTTPException(404, "File not found")
    return r.content, r.headers.get("Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream")


app = FastAPI(title="Lily Spanish API")
api = APIRouter(prefix="/api")
logger = logging.getLogger("lily")
logging.basicConfig(level=logging.INFO)

ANALYTICS_EVENT_NAMES = {
    "user_logged_in",
    "dashboard_viewed",
    "class_booked",
    "class_cancelled",
    "class_rescheduled",
    "class_completed",
    "feedback_added",
    "credits_purchased",
    "credits_granted",
    "credits_used",
    "availability_created",
    "availability_blocked",
    "invitation_sent",
    "student_profile_viewed",
    "teacher_profile_viewed",
    "calendar_synced",
    "role_assigned",
    "permission_modified",
    "settings_updated",
    "report_exported",
}


def _error_payload(code: str, message: str, request_id: str, details: Optional[dict] = None) -> dict:
    return {
        "code": code,
        "message": message,
        "details": details or {},
        "requestId": request_id,
        "timestamp": _now_iso(),
    }


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex}")
    message = exc.detail if isinstance(exc.detail, str) else "Request could not be completed."
    code = "http_error"
    if exc.status_code == 401:
        code = "unauthorized"
    elif exc.status_code == 403:
        code = "forbidden"
    elif exc.status_code == 404:
        code = "not_found"
    elif exc.status_code >= 500:
        code = "server_error"
    if exc.status_code >= 500:
        await _record_error_event(request, request_id, code, message, exc.status_code)
    return JSONResponse(status_code=exc.status_code, content=_error_payload(code, message, request_id))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex}")
    logger.exception("Unhandled request error %s %s", request_id, exc)
    await _record_error_event(request, request_id, "unhandled_exception", str(exc), 500)
    return JSONResponse(
        status_code=500,
        content=_error_payload("server_error", "Something went wrong. Please try again.", request_id),
    )

# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "alumno"
    google_id: Optional[str] = None
    password_hash: Optional[str] = None
    auth_provider: str = "supabase"
    profile_type: str = "client"
    active: bool = True
    status: str = "active"
    active_school_id: Optional[str] = None
    updated_at: Optional[str] = None
    last_login_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Product(BaseModel):
    id: str
    slug: str
    name_en: str
    name_es: str
    description_en: str
    description_es: str
    duration_min: int  # 0 for packages/subscriptions
    sessions_included: int = 1
    price_usd: float
    type: str  # single | package | subscription | trial
    popular: bool = False
    currency: str = "USD"
    teacher_id: Optional[str] = None
    capacity: int = 1
    active: bool = True
    image: str = ""
    language: str = "es"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class Availability(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str           # YYYY-MM-DD (in teacher's TZ - America/Mexico_City assumed)
    start_time: str     # HH:MM (24h, teacher TZ)
    available: bool = True

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    product_id: str
    product_name: str
    duration_min: int
    scheduled_date: str
    scheduled_time: str
    timezone: str
    status: str = "confirmed"   # confirmed | completed | cancelled
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    payment_session_id: Optional[str] = None
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    title_en: str
    title_es: str
    excerpt_en: str
    excerpt_es: str
    body_en: str
    body_es: str
    cover_image: str
    published: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LocalAuthPayload(BaseModel):
    email: str
    password: str


class RegisterPayload(LocalAuthPayload):
    name: str
    profile_type: str = "client"


ROLE_ALIASES = {
    "admin": "administrador_sitio",
    "student": "alumno",
    "teacher": "profesor",
    "school_admin": "administrador_escolar",
    "school_administrative": "administrador_escolar",
    "finance": "finanzas",
    "cms": "editor_cms",
}
ADMIN_ROLES = {"administrador_sitio", "administrador_profesor"}
ROLE_LABELS = {
    "administrador_sitio": "Super Admin",
    "administrador_profesor": "Admin",
    "administrador_escolar": "School Administrative",
    "coordinador": "Coordinator",
    "profesor": "Teacher",
    "editor_cms": "Editor CMS",
    "alumno": "Student",
    "tutor_padre": "Tutor / Parent",
    "finanzas": "Finance",
    "viewer": "Viewer",
}
ROLE_LEVELS = {
    "alumno": 10,
    "viewer": 15,
    "tutor_padre": 20,
    "profesor": 30,
    "coordinador": 60,
    "editor_cms": 40,
    "finanzas": 55,
    "administrador_escolar": 65,
    "administrador_profesor": 70,
    "administrador_sitio": 100,
}
SYSTEM_ROLE_NAMES = {"administrador_sitio", "administrador_profesor", "administrador_escolar", "coordinador", "profesor", "alumno", "tutor_padre", "finanzas", "viewer"}
CRITICAL_PERMISSION_ACTIONS = {"delete", "refund", "grant", "modify", "assign", "sync_google"}


def _dot_permission(name: str, description: str, level: int = 1) -> dict:
    parts = name.split(".")
    module = parts[0] if parts else "platform"
    section = parts[1] if len(parts) > 1 else "general"
    action = parts[2] if len(parts) > 2 else "view"
    risk = "critical" if action in CRITICAL_PERMISSION_ACTIONS or "permissions" in section else "high" if action in {"edit", "create", "cancel", "complete", "export"} else "low"
    return {
        "name": name,
        "label": name,
        "description": description,
        "catalog": module,
        "module": module,
        "section": section,
        "feature": section,
        "action": action,
        "risk_level": risk,
        "level": level,
    }


DOT_PERMISSION_CATALOG = [
    _dot_permission("dashboard.general.view", "View the administrative dashboard."),
    _dot_permission("users.profile.view", "View user profiles."),
    _dot_permission("users.profile.edit", "Edit user profiles.", 4),
    _dot_permission("users.profile.delete", "Delete users.", 5),
    _dot_permission("users.roles.assign", "Assign roles to users.", 5),
    _dot_permission("roles.management.view", "View roles and permissions.", 5),
    _dot_permission("roles.management.create", "Create roles.", 5),
    _dot_permission("roles.management.edit", "Edit roles.", 5),
    _dot_permission("roles.management.delete", "Delete roles.", 5),
    _dot_permission("roles.permissions.modify", "Modify role permissions.", 5),
    _dot_permission("calendar.teacher.view", "View teacher calendar."),
    _dot_permission("calendar.teacher.create", "Create calendar availability.", 3),
    _dot_permission("calendar.teacher.edit", "Edit calendar sessions.", 3),
    _dot_permission("calendar.teacher.delete", "Delete calendar sessions.", 4),
    _dot_permission("calendar.teacher.block", "Block teacher time.", 3),
    _dot_permission("calendar.teacher.sync_google", "Connect or sync Google Calendar.", 4),
    _dot_permission("calendar.teacher.invite_students", "Invite students to open slots.", 3),
    _dot_permission("classes.sessions.view", "View class sessions."),
    _dot_permission("classes.sessions.create", "Create class sessions.", 3),
    _dot_permission("classes.sessions.edit", "Edit class sessions.", 3),
    _dot_permission("classes.sessions.cancel", "Cancel class sessions.", 4),
    _dot_permission("classes.sessions.complete", "Complete class sessions.", 3),
    _dot_permission("classes.sessions.feedback", "Submit class feedback.", 3),
    _dot_permission("learning.roadmaps.view", "View learning roadmaps."),
    _dot_permission("learning.roadmaps.create", "Create learning roadmaps.", 4),
    _dot_permission("learning.roadmaps.edit", "Edit learning roadmaps.", 4),
    _dot_permission("learning.roadmaps.publish", "Publish learning roadmaps.", 5),
    _dot_permission("students.profile.view", "View student profiles."),
    _dot_permission("students.profile.edit", "Edit student profiles.", 4),
    _dot_permission("students.progress.view", "View student progress."),
    _dot_permission("students.progress.edit", "Edit student progress.", 4),
    _dot_permission("students.credits.view", "View student credits."),
    _dot_permission("students.credits.modify", "Modify student credits.", 5),
    _dot_permission("teachers.profile.view", "View teacher profiles."),
    _dot_permission("teachers.profile.edit", "Edit teacher profiles.", 4),
    _dot_permission("teachers.availability.view", "View teacher availability."),
    _dot_permission("teachers.availability.manage", "Manage teacher availability.", 4),
    _dot_permission("credits.wallet.view", "View credit wallets."),
    _dot_permission("credits.wallet.purchase", "Purchase credits.", 2),
    _dot_permission("credits.wallet.grant", "Grant credits.", 5),
    _dot_permission("credits.wallet.transfer", "Transfer credits.", 4),
    _dot_permission("credits.wallet.refund", "Refund credits.", 5),
    _dot_permission("reports.analytics.view", "View analytics reports."),
    _dot_permission("reports.analytics.export", "Export analytics reports.", 4),
    _dot_permission("logs.activity.view", "View operational activity logs.", 4),
    _dot_permission("settings.platform.view", "View platform settings.", 4),
    _dot_permission("settings.platform.edit", "Edit platform settings.", 5),
    _dot_permission("audit.logs.view", "View audit logs.", 5),
    _dot_permission("technical.wiki.view", "View restricted technical documentation.", 5),
    _dot_permission("settings.view", "View platform configuration.", 4),
    _dot_permission("settings.edit", "Edit platform configuration.", 5),
    _dot_permission("audit.view", "View security audit logs.", 5),
    _dot_permission("logs.view", "View activity logs.", 4),
    _dot_permission("atlas.view", "View approved Atlas documentation.", 3),
    _dot_permission("atlas.manage", "Manage all Atlas documentation.", 5),
    _dot_permission("atlas.create", "Create Atlas volumes and records.", 5),
    _dot_permission("atlas.edit", "Edit Atlas content.", 5),
    _dot_permission("atlas.delete", "Delete Atlas content.", 5),
    _dot_permission("atlas.review", "Review Atlas content.", 5),
    _dot_permission("atlas.approve", "Approve Atlas content.", 5),
    _dot_permission("atlas.export", "Export Atlas content.", 4),
    _dot_permission("atlas.settings.manage", "Manage Atlas settings.", 5),
    _dot_permission("atlas.decision_log.manage", "Manage Atlas decision log.", 5),
    _dot_permission("atlas.glossary.manage", "Manage Atlas glossary.", 5),
    _dot_permission("atlas.audit.view", "View Atlas audit trail.", 5),
]
PERMISSION_CATALOG = [
    {"name": "*", "label": "Acceso total", "catalog": "system", "feature": "all", "action": "manage", "level": 100},
    {"name": "dashboard:view", "label": "Ver dashboard", "catalog": "platform", "feature": "dashboard", "action": "view", "level": 1},
    {"name": "users:manage", "label": "Administrar usuarios", "catalog": "administration", "feature": "users", "action": "manage", "level": 4},
    {"name": "roles:manage", "label": "Administrar roles y permisos", "catalog": "administration", "feature": "rbac", "action": "manage", "level": 5},
    {"name": "teachers:manage", "label": "Administrar profesores", "catalog": "school", "feature": "teachers", "action": "manage", "level": 4},
    {"name": "teachers:own", "label": "Ver perfil docente propio", "catalog": "school", "feature": "teachers", "action": "own", "level": 1},
    {"name": "students:manage", "label": "Administrar alumnos", "catalog": "school", "feature": "students", "action": "manage", "level": 4},
    {"name": "students:view", "label": "Ver alumnos", "catalog": "school", "feature": "students", "action": "view", "level": 1},
    {"name": "products:manage", "label": "Administrar productos", "catalog": "commerce", "feature": "products", "action": "manage", "level": 4},
    {"name": "bookings:manage", "label": "Administrar reservas", "catalog": "school", "feature": "bookings", "action": "manage", "level": 4},
    {"name": "bookings:assigned", "label": "Ver clases asignadas", "catalog": "school", "feature": "bookings", "action": "assigned", "level": 1},
    {"name": "cms:manage", "label": "Administrar contenido", "catalog": "content", "feature": "cms", "action": "manage", "level": 4},
    {"name": "media:manage", "label": "Administrar medios", "catalog": "content", "feature": "media", "action": "manage", "level": 3},
    {"name": "student:self", "label": "Portal propio de alumno", "catalog": "learning", "feature": "student_portal", "action": "self", "level": 1},
    {"name": "credits:grant", "label": "Otorgar créditos", "catalog": "learning", "feature": "credits", "action": "grant", "level": 4},
    {"name": "lessons:create", "label": "Crear lecciones", "catalog": "learning", "feature": "lessons", "action": "create", "level": 3},
    {"name": "lessons:approve", "label": "Aprobar lecciones", "catalog": "learning", "feature": "lessons", "action": "approve", "level": 4},
] + DOT_PERMISSION_CATALOG + CANONICAL_PERMISSIONS
ROLE_PERMISSION_LEVELS: Dict[str, Dict[str, int]] = {
    "administrador_sitio": {"*": 100},
    "administrador_profesor": {
        "dashboard:view": 5, "users:manage": 4, "roles:manage": 4, "teachers:manage": 4,
        "students:manage": 4, "products:manage": 4, "bookings:manage": 4,
        "credits:grant": 4, "lessons:create": 4, "lessons:approve": 4,
        "dashboard.general.view": 5, "users.profile.view": 5, "users.profile.edit": 4,
        "users.roles.assign": 5, "roles.management.view": 5, "roles.management.create": 5,
        "roles.management.edit": 5, "roles.management.delete": 4, "roles.permissions.modify": 5,
        "calendar.teacher.view": 4, "calendar.teacher.edit": 4, "classes.sessions.view": 4,
        "classes.sessions.edit": 4, "students.profile.view": 4, "students.progress.view": 4,
        "teachers.profile.view": 4, "credits.wallet.view": 4, "credits.wallet.grant": 4,
        "reports.analytics.view": 4, "reports.analytics.export": 4, "settings.platform.view": 4,
        "settings.view": 4, "logs.activity.view": 4, "logs.view": 4, "audit.logs.view": 5, "audit.view": 5,
        "atlas.view": 4, "atlas.export": 4,
    },
    "administrador_escolar": {
        "dashboard.general.view": 4, "users.profile.view": 3, "users.profile.edit": 3,
        "students.profile.view": 4, "students.profile.edit": 4, "students.progress.view": 4,
        "teachers.profile.view": 4, "teachers.profile.edit": 3, "teachers.availability.view": 3,
        "classes.sessions.view": 4, "classes.sessions.create": 4, "classes.sessions.edit": 4,
        "classes.sessions.cancel": 4, "learning.roadmaps.view": 4, "learning.roadmaps.create": 4,
        "learning.roadmaps.edit": 4, "learning.roadmaps.publish": 4, "reports.analytics.view": 3,
        "credits.wallet.view": 3, "credits.wallet.grant": 4, "logs.activity.view": 3,
        "lessons:create": 4, "lessons:approve": 4,
    },
    "coordinador": {
        "dashboard.general.view": 3, "users.profile.view": 3, "calendar.teacher.view": 3,
        "calendar.teacher.edit": 3, "calendar.teacher.block": 3, "calendar.teacher.invite_students": 3,
        "classes.sessions.view": 3, "classes.sessions.create": 3, "classes.sessions.edit": 3,
        "classes.sessions.cancel": 3, "students.profile.view": 3, "students.profile.edit": 3,
        "students.progress.view": 3, "students.credits.view": 3, "teachers.profile.view": 3,
        "teachers.profile.edit": 3, "teachers.availability.view": 3, "teachers.availability.manage": 3,
        "credits.wallet.view": 3, "reports.analytics.view": 3, "logs.activity.view": 3, "logs.view": 3,
    },
    "profesor": {
        "dashboard:view": 1, "teachers:own": 2, "students:view": 2,
        "bookings:assigned": 2, "lessons:create": 2,
        "calendar.teacher.view": 2, "calendar.teacher.create": 2, "calendar.teacher.edit": 2,
        "calendar.teacher.block": 2, "calendar.teacher.invite_students": 2,
        "classes.sessions.view": 2, "classes.sessions.feedback": 2,
        "students.profile.view": 1, "students.progress.view": 1,
        "teachers.availability.view": 2, "teachers.availability.manage": 2,
    },
    "editor_cms": {"dashboard:view": 1, "cms:manage": 4, "media:manage": 3, "lessons:create": 3},
    "alumno": {"student:self": 1, "dashboard.general.view": 1, "students.progress.view": 1, "credits.wallet.view": 1, "credits.wallet.purchase": 1},
    "tutor_padre": {"dashboard.general.view": 1, "students.progress.view": 1, "credits.wallet.view": 1, "credits.wallet.purchase": 1, "classes.sessions.view": 1},
    "viewer": {"dashboard.general.view": 1, "reports.analytics.view": 1},
}
ROLE_PERMISSIONS = {role: set(perms) for role, perms in ROLE_PERMISSION_LEVELS.items()}

# The canonical policy augments legacy permissions during the compatibility
# window.  Runtime authorization and the database remain permission-driven.
for _role_name, _grants in ROLE_GRANTS.items():
    ROLE_PERMISSION_LEVELS.setdefault(_role_name, {})
    for _permission_name in _grants:
        ROLE_PERMISSION_LEVELS[_role_name][_permission_name] = max(
            ROLE_PERMISSION_LEVELS[_role_name].get(_permission_name, 0),
            next((int(item.get("level") or 1) for item in CANONICAL_PERMISSIONS if item["name"] == _permission_name), 100 if _permission_name == "*" else 1),
        )
ROLE_PERMISSIONS = {role: set(perms) for role, perms in ROLE_PERMISSION_LEVELS.items()}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug or f"item-{uuid.uuid4().hex[:8]}"


def _normalize_role(role: Optional[str]) -> str:
    return ROLE_ALIASES.get((role or "alumno").strip(), (role or "alumno").strip())


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PASSWORD_HASH_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt}${digest.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, iterations, salt, expected = stored_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations)).hex()
        return secrets.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _safe_profile_type(profile_type: Optional[str]) -> str:
    allowed = {"client", "student", "parent", "tutor"}
    value = (profile_type or "client").strip().lower()
    return value if value in allowed else "client"


def _public_user(user: User) -> dict:
    doc = user.model_dump()
    doc.pop("password_hash", None)
    return doc


async def _effective_role_names(user: User) -> List[str]:
    docs = await db.user_roles.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    now = datetime.now(timezone.utc)
    roles = set()
    for doc in docs:
        if not doc.get("active", True) or doc.get("status", "active") != "active":
            continue
        if doc.get("expires_at"):
            try:
                if _parse_iso(doc["expires_at"]) <= now:
                    continue
            except (TypeError, ValueError):
                continue
        role_name = _normalize_role(doc.get("role_name"))
        role_doc = await db.roles.find_one({"name": role_name}, {"_id": 0})
        if role_doc and role_doc.get("active", True) and role_doc.get("status", "active") == "active":
            roles.add(role_name)
    if not roles:
        fallback = _normalize_role(user.role)
        role_doc = await db.roles.find_one({"name": fallback}, {"_id": 0})
        if role_doc and role_doc.get("active", True) and role_doc.get("status", "active") == "active":
            roles = {fallback}
    return sorted(roles, key=lambda role: ROLE_LEVELS.get(role, 0), reverse=True)


async def _effective_permission_levels(user: User) -> Dict[str, int]:
    effective: Dict[str, int] = {}
    for role in await _effective_role_names(user):
        fallback = ROLE_PERMISSION_LEVELS.get(role, {})
        docs = await db.role_permissions.find({"role_name": role}, {"_id": 0}).to_list(1000)
        if not docs:
            for permission, level in fallback.items():
                effective[permission] = max(effective.get(permission, 0), int(level))
        for doc in docs:
            permission = doc.get("permission")
            level = int(doc.get("level") or 0) if doc.get("allowed", True) else 0
            if permission and level > 0:
                effective[permission] = max(effective.get(permission, 0), level)
    return effective


async def _effective_permission_grants(user: User) -> Dict[str, List[str]]:
    """Return effective permission scopes, excluding inactive grants and roles."""
    grants: Dict[str, set] = {}
    for role in await _effective_role_names(user):
        fallback_scopes = ROLE_GRANTS.get(role, {})
        docs = await db.role_permissions.find({"role_name": role}, {"_id": 0}).to_list(1000)
        if not docs:
            for permission, scope in fallback_scopes.items():
                grants.setdefault(permission, set()).add(scope)
        for doc in docs:
            if not doc.get("allowed", True) or int(doc.get("level") or 0) <= 0:
                continue
            permission = doc.get("permission")
            scope = doc.get("scope") or "self"
            if permission:
                grants.setdefault(permission, set()).add(scope)
    return {permission: sorted(scopes) for permission, scopes in grants.items()}


async def _authorized_school_ids(user: User) -> List[str]:
    memberships = await db.user_school_memberships.find(
        {"user_id": user.user_id, "status": "active"}, {"_id": 0}
    ).to_list(500)
    assignments = await db.user_roles.find(
        {"user_id": user.user_id, "active": True, "status": "active"}, {"_id": 0}
    ).to_list(500)
    school_ids = {item.get("school_id") for item in memberships + assignments if item.get("school_id")}
    if user.active_school_id:
        school_ids.add(user.active_school_id)
    return sorted(school_ids)


async def can(
    user: User,
    permission_code: str,
    *,
    resource_owner_id: Optional[str] = None,
    school_id: Optional[str] = None,
    linked: bool = False,
    assigned: bool = False,
) -> bool:
    if not user.active or user.status != "active":
        return False
    grants = await _effective_permission_grants(user)
    context = ScopeContext(
        actor_user_id=user.user_id,
        resource_owner_id=resource_owner_id,
        school_id=school_id,
        authorized_school_ids=frozenset(await _authorized_school_ids(user)),
        linked=linked,
        assigned=assigned,
    )
    return permission_allows(grants, permission_code, context)


async def authorize(
    user: User,
    permission_code: str,
    *,
    request: Optional[Request] = None,
    resource_type: str = "resource",
    resource_id: Optional[str] = None,
    resource_owner_id: Optional[str] = None,
    school_id: Optional[str] = None,
    linked: bool = False,
    assigned: bool = False,
) -> None:
    if await can(
        user, permission_code, resource_owner_id=resource_owner_id, school_id=school_id,
        linked=linked, assigned=assigned,
    ):
        return
    await _record_audit_event(
        "authorization.denied", resource_type, entity_id=resource_id,
        actor_user_id=user.user_id, permission_code=permission_code, result="denied",
        denial_reason="scope_or_permission_denied", school_id=school_id, request=request,
        risk_level=_permission_risk(permission_code),
    )
    raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción.")


async def _permission_scopes(user: User, permission_code: str) -> set:
    grants = await _effective_permission_grants(user)
    return set(grants.get("*", [])) | set(grants.get(permission_code, []))


async def _scoped_users(user: User, permission_code: str = "users.view") -> List[dict]:
    """Query users within effective scope; never fetch the global set first."""
    scopes = await _permission_scopes(user, permission_code)
    if "global" in scopes:
        return await db.users.find({}, {"_id": 0}).to_list(1000)
    rows: Dict[str, dict] = {}
    if "self" in scopes:
        own = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
        if own:
            rows[own["user_id"]] = own
    if scopes & {"school", "multi_school"}:
        for school_id in await _authorized_school_ids(user):
            for item in await db.users.find({"active_school_id": school_id}, {"_id": 0}).to_list(1000):
                rows[item["user_id"]] = item
    if "linked" in scopes:
        links = await db.tutor_student_links.find(
            {"tutor_user_id": user.user_id, "status": "active"}, {"_id": 0}
        ).to_list(1000)
        for link in links:
            item = await db.users.find_one({"user_id": link["student_user_id"]}, {"_id": 0})
            if item:
                rows[item["user_id"]] = item
    if "assigned" in scopes:
        assignments = await db.teacher_student_assignments.find(
            {"teacher_user_id": user.user_id, "status": "active"}, {"_id": 0}
        ).to_list(1000)
        for assignment in assignments:
            item = await db.users.find_one({"user_id": assignment["student_user_id"]}, {"_id": 0})
            if item:
                rows[item["user_id"]] = item
    if not scopes:
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción.")
    return list(rows.values())


async def _has_permission(user: User, permission: str, min_level: int = 1) -> bool:
    permissions = await _effective_permission_levels(user)
    return permissions.get("*", 0) >= min_level or permissions.get(permission, 0) >= min_level


async def _has_any_permission(user: User, permissions: List[str]) -> bool:
    return any([await _has_permission(user, permission) for permission in permissions])


async def _has_all_permissions(user: User, permissions: List[str]) -> bool:
    return all([await _has_permission(user, permission) for permission in permissions])


async def _can_perform_action(user: User, action: str) -> bool:
    return await _has_permission(user, action)


async def _can_access_route(user: User, route: str) -> bool:
    route_permissions = {
        "/admin/roles-permissions": "roles.management.view",
        "/admin/iam": "roles.management.view",
        "/admin/roles": "roles.management.view",
        "/admin/users": "users.profile.view",
        "/teacher/calendar": "calendar.teacher.view",
    }
    permission = route_permissions.get(route)
    return True if not permission else await _has_permission(user, permission)


def _permission_risk(permission: str) -> str:
    if permission == "*":
        return "critical"
    for item in PERMISSION_CATALOG:
        if item["name"] == permission:
            return item.get("risk_level", "low")
    action = permission.split(".")[-1]
    return "critical" if action in CRITICAL_PERMISSION_ACTIONS else "low"


def _role_type(role_name: str, role: Optional[dict] = None) -> str:
    return (role or {}).get("type") or ("system" if role_name in SYSTEM_ROLE_NAMES else "custom")


def _role_status(role: dict) -> str:
    return role.get("status") or ("active" if role.get("active", True) else "inactive")


async def _active_user_roles(user_id: str) -> List[str]:
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    docs = await db.user_roles.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    roles = {_normalize_role(doc.get("role_name")) for doc in docs if doc.get("active", True)}
    if not roles and user_doc:
        roles = {_normalize_role(user_doc.get("role"))}
    return sorted(roles, key=lambda role: ROLE_LEVELS.get(role, 0), reverse=True)


async def _role_payload(role: dict, include_users: bool = False, include_audit: bool = False) -> dict:
    assignments = await db.role_permissions.find({"role_name": role["name"]}, {"_id": 0}).to_list(500)
    permission_levels = {rp["permission"]: int(rp.get("level") or 1) for rp in assignments if int(rp.get("level") or 0) > 0}
    permission_scopes = {rp["permission"]: rp.get("scope") or "self" for rp in assignments if int(rp.get("level") or 0) > 0 and rp.get("allowed", True)}
    active_assignments = await db.user_roles.find({"role_name": role["name"], "active": True}, {"_id": 0}).to_list(500)
    user_ids = {item["user_id"] for item in active_assignments}
    primary_users = await db.users.find({"role": role["name"]}, {"_id": 0}).to_list(500)
    user_ids.update({item["user_id"] for item in primary_users})
    payload = {
        **role,
        "type": _role_type(role["name"], role),
        "status": _role_status(role),
        "active": role.get("active", True),
        "permissions": sorted(permission_levels.keys()),
        "permission_levels": permission_levels,
        "permission_scopes": permission_scopes,
        "permissionCount": len(permission_levels),
        "userCount": len(user_ids),
    }
    if include_users:
        users = []
        for user_id in sorted(user_ids):
            doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if doc:
                doc["roles"] = await _active_user_roles(user_id)
                users.append(doc)
        payload["users"] = users
    if include_audit:
        audit = await db.audit_events.find({"entity_type": "role", "entity_id": role["name"]}, {"_id": 0}).to_list(100)
        audit.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
        payload["audit"] = audit
    return payload

# ---------- Auth helpers ----------
async def _record_login(user_id: str, email: str, provider: str, request: Optional[Request] = None) -> None:
    await db.login_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "email": email,
        "provider": provider,
        "ip_address": request.client.host if request and request.client else None,
        "user_agent": request.headers.get("user-agent") if request else None,
        "created_at": _now_iso(),
    })


async def _record_audit_event(
    event_type: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    target_user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    risk_level: str = "low",
    actor_role_id: Optional[str] = None,
    school_id: Optional[str] = None,
    permission_code: Optional[str] = None,
    result: str = "success",
    denial_reason: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    await db.audit_events.insert_one({
        "id": str(uuid.uuid4()),
        "actor_user_id": actor_user_id,
        "actor_name": actor_name,
        "actor_role_id": actor_role_id,
        "school_id": school_id,
        "target_user_id": target_user_id,
        "event_type": event_type,
        "action": event_type,
        "entity_type": entity_type,
        "target_type": entity_type,
        "entity_id": entity_id,
        "target_id": entity_id,
        "permission_code": permission_code,
        "result": result,
        "denial_reason": denial_reason,
        "before_state": before or {},
        "after_state": after or {},
        "metadata": metadata or {},
        "ip_address": request.client.host if request and request.client else None,
        "user_agent": request.headers.get("user-agent") if request else None,
        "request_id": getattr(request.state, "request_id", None) if request else None,
        "risk_level": risk_level,
        "created_at": _now_iso(),
    })


async def _record_activity_log(
    event_type: str,
    action: str,
    target_type: str,
    summary: str,
    actor_user_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    target_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    visibility: str = "admin",
) -> None:
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "actor_user_id": actor_user_id,
        "actor_name": actor_name,
        "event_type": event_type,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "summary": summary,
        "metadata": metadata or {},
        "visibility": visibility,
        "created_at": _now_iso(),
    })


async def _record_atlas_audit(
    action: str,
    target_type: str,
    target_id: Optional[str],
    actor_user_id: Optional[str],
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    metadata: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    await db.atlas_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "actor_user_id": actor_user_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "before_state": before or {},
        "after_state": after or {},
        "metadata": metadata or {},
        "created_at": _now_iso(),
    })
    await _record_audit_event(
        f"atlas.{action}",
        target_type,
        entity_id=target_id,
        actor_user_id=actor_user_id,
        metadata=metadata or {},
        before=before,
        after=after,
        risk_level="high" if action in {"approve", "deprecate", "delete", "settings.update"} else "low",
        request=request,
    )


async def _record_analytics_event(
    event_name: str,
    user: Optional[User] = None,
    user_id: Optional[str] = None,
    role: Optional[str] = None,
    module: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    session_id: Optional[str] = None,
) -> None:
    if event_name not in ANALYTICS_EVENT_NAMES:
        logger.warning("Unknown analytics event ignored: %s", event_name)
        return
    await db.analytics_events.insert_one({
        "id": str(uuid.uuid4()),
        "event_name": event_name,
        "user_id": user.user_id if user else user_id,
        "role": _normalize_role(user.role) if user else role,
        "session_id": session_id,
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "created_at": _now_iso(),
    })


async def _record_error_event(
    request: Request,
    request_id: str,
    code: str,
    message: str,
    status_code: int,
    details: Optional[dict] = None,
) -> None:
    if not db:
        return
    try:
        await db.error_events.insert_one({
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "user_id": getattr(getattr(request, "state", None), "user_id", None),
            "code": code,
            "message": message,
            "details": details or {},
            "path": request.url.path,
            "method": request.method,
            "status_code": status_code,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "created_at": _now_iso(),
        })
    except Exception as exc:
        logger.warning("Could not persist error event: %s", exc)


async def _create_local_session(user: User, request: Optional[Request] = None) -> dict:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=LOCAL_AUTH_SESSION_MINUTES)
    token = f"{LOCAL_AUTH_TOKEN_PREFIX}{secrets.token_urlsafe(48)}"
    session_id = str(uuid.uuid4())
    await db.local_auth_sessions.insert_one({
        "id": session_id,
        "user_id": user.user_id,
        "token_hash": _token_hash(token),
        "expires_at": expires_at.isoformat(),
        "revoked_at": None,
        "created_at": now.isoformat(),
        "last_seen_at": now.isoformat(),
        "ip_address": request.client.host if request and request.client else None,
        "user_agent": request.headers.get("user-agent") if request else None,
    })
    return {"access_token": token, "token_type": "bearer", "session_id": session_id, "expires_at": expires_at.isoformat(), "expires_in": LOCAL_AUTH_SESSION_MINUTES * 60}


async def _get_user_from_local_session(token: str) -> User:
    session = await db.local_auth_sessions.find_one({"token_hash": _token_hash(token)}, {"_id": 0})
    if not session or session.get("revoked_at"):
        raise HTTPException(status_code=401, detail="Invalid auth token")
    if _parse_iso(session["expires_at"]) <= datetime.now(timezone.utc):
        await db.local_auth_sessions.update_one({"id": session["id"]}, {"$set": {"revoked_at": _now_iso()}})
        raise HTTPException(status_code=401, detail="Session expired")
    await db.local_auth_sessions.update_one({"id": session["id"]}, {"$set": {"last_seen_at": _now_iso()}})
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc or user_doc.get("active") is False or user_doc.get("status", "active") != "active":
        raise HTTPException(status_code=403, detail="User is inactive")
    return User(**user_doc)


async def _sync_user_role(
    user_id: str,
    role: str,
    assigned_by: Optional[str] = None,
    school_id: Optional[str] = None,
    expires_at: Optional[str] = None,
) -> None:
    role = _normalize_role(role)
    now = _now_iso()
    query = {"user_id": user_id, "role_name": role, "school_id": school_id}
    existing = await db.user_roles.find_one(query, {"_id": 0})
    assignment = {
        "active": True, "status": "active", "school_id": school_id,
        "assigned_by": assigned_by, "assigned_at": now, "expires_at": expires_at, "updated_at": now,
    }
    if existing:
        await db.user_roles.update_one({"id": existing["id"]}, {"$set": assignment})
    else:
        await db.user_roles.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "role_name": role,
            **assignment, "created_at": now,
        })


async def _get_or_create_user_from_supabase(payload: dict, request: Optional[Request] = None) -> User:
    user_id = payload.get("sub")
    email = (payload.get("email") or "").lower()
    metadata = payload.get("user_metadata") or {}
    name = metadata.get("full_name") or metadata.get("name") or email.split("@")[0]
    picture = metadata.get("avatar_url") or metadata.get("picture")

    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    role = "administrador_sitio" if email in ADMIN_EMAILS else "alumno"
    now = _now_iso()

    if existing:
        current_role = _normalize_role(existing.get("role"))
        updates = {"email": email, "name": name, "picture": picture, "google_id": user_id, "updated_at": now, "last_login_at": now}
        if current_role != existing.get("role"):
            updates["role"] = current_role
        if email in ADMIN_EMAILS and current_role != "administrador_sitio":
            updates["role"] = "administrador_sitio"
        await db.users.update_one({"user_id": user_id}, {"$set": updates})
    else:
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "google_id": user_id,
            "auth_provider": "supabase",
            "profile_type": "client",
            "active": True,
            "created_at": now,
            "updated_at": now,
            "last_login_at": now,
        })

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    await _sync_user_role(user_id, user_doc.get("role", role))
    await _record_login(user_id, email, "google", request)
    if user_doc.get("active") is False or user_doc.get("status", "active") != "active":
        raise HTTPException(status_code=403, detail="User is inactive")
    return User(**user_doc)


def _decode_supabase_token(token: str) -> dict:
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET is not configured")
    try:
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid auth token")


async def _get_supabase_user_payload(token: str) -> dict:
    if not SUPABASE_URL:
        return _decode_supabase_token(token)
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY,
    }
    async with httpx.AsyncClient(timeout=20.0) as hc:
        r = await hc.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    data = r.json()
    metadata = data.get("user_metadata") or data.get("raw_user_meta_data") or {}
    return {
        "sub": data.get("id"),
        "email": data.get("email"),
        "user_metadata": metadata,
    }


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1].strip()
    if token.startswith(LOCAL_AUTH_TOKEN_PREFIX):
        user = await _get_user_from_local_session(token)
        request.state.user_id = user.user_id
        return user

    if _dev_auth_enabled() and token == "dev-admin":
        now = _now_iso()
        user_id = "dev-admin"
        existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not existing:
            await db.users.insert_one({
                "user_id": user_id,
                "google_id": user_id,
                "email": "admin@mosaico.local",
                "name": "Admin Local",
                "picture": "",
                "role": "administrador_sitio",
                "active": True,
                "created_at": now,
                "updated_at": now,
                "last_login_at": now,
            })
            await _sync_user_role(user_id, "administrador_sitio")
        else:
            await db.users.update_one({"user_id": user_id}, {"$set": {"last_login_at": now, "active": True, "role": "administrador_sitio"}})
        doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        user = User(**doc)
        request.state.user_id = user.user_id
        return user

    payload = await _get_supabase_user_payload(token)
    user = await _get_or_create_user_from_supabase(payload, request)
    request.state.user_id = user.user_id
    return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    roles = await _effective_role_names(user)
    if not any(role in ADMIN_ROLES for role in roles):
        raise HTTPException(status_code=403, detail="Admin only")
    return user


async def require_global_admin(user: User = Depends(get_current_user)) -> User:
    roles = await _effective_role_names(user)
    if "administrador_sitio" not in roles or not await _has_permission(user, "*", 100):
        raise HTTPException(status_code=403, detail="Global administrator access required")
    return user


def require_permission(permission: str, min_level: int = 1):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if not await _has_permission(user, permission, min_level):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


async def require_technical(user: User = Depends(get_current_user)) -> User:
    roles = await _effective_role_names(user)
    if (
        "administrador_sitio" in roles
        or await _has_permission(user, "technical.wiki.view")
        or await _has_permission(user, "*", 100)
    ):
        return user
    raise HTTPException(status_code=403, detail="Technical role required")


TECHNICAL_DOCS = {
    "product-overview": {"title": "Product Overview", "path": "docs/product-overview.md", "section": "roadmap"},
    "roadmap": {"title": "Roadmap", "path": "docs/roadmap.md", "section": "roadmap"},
    "business-structure": {"title": "Business Structure", "path": "docs/business-structure.md", "section": "roadmap"},
    "final-production-report": {"title": "Final Production Report", "path": "docs/final-production-report.md", "section": "roadmap"},
    "user-roles": {"title": "User Roles", "path": "docs/user-roles.md", "section": "configuration"},
    "rbac-permissions": {"title": "RBAC Permissions", "path": "docs/rbac-permissions.md", "section": "configuration"},
    "admin-guide": {"title": "Admin Guide", "path": "docs/admin-guide.md", "section": "configuration"},
    "teacher-guide": {"title": "Teacher Guide", "path": "docs/teacher-guide.md", "section": "configuration"},
    "student-guide": {"title": "Student Guide", "path": "docs/student-guide.md", "section": "configuration"},
    "tutor-parent-guide": {"title": "Tutor And Parent Guide", "path": "docs/tutor-parent-guide.md", "section": "configuration"},
    "coordinator-guide": {"title": "Coordinator Guide", "path": "docs/coordinator-guide.md", "section": "configuration"},
    "api-overview": {"title": "API Overview", "path": "docs/api-overview.md", "section": "data"},
    "audit-logs": {"title": "Audit Logs", "path": "docs/audit-logs.md", "section": "data"},
    "analytics-events": {"title": "Analytics Events", "path": "docs/analytics-events.md", "section": "data"},
    "environment-setup": {"title": "Environment Setup", "path": "docs/environment-setup.md", "section": "configuration"},
    "testing-guide": {"title": "Testing Guide", "path": "docs/testing-guide.md", "section": "architecture"},
    "production-readiness-checklist": {"title": "Production Readiness Checklist", "path": "docs/production-readiness-checklist.md", "section": "architecture"},
    "security-checklist": {"title": "Security Checklist", "path": "docs/security-checklist.md", "section": "architecture"},
    "release-process": {"title": "Release Process", "path": "docs/release-process.md", "section": "architecture"},
    "platform-roadmap": {"title": "Platform Roadmap", "path": "docs/PLATFORM_ROADMAP.md", "section": "roadmap"},
    "phase-1-execution-plan": {"title": "Phase 1 Execution Plan", "path": "docs/PHASE_1_EXECUTION_PLAN.md", "section": "roadmap"},
    "product-documentation": {"title": "Product Documentation", "path": "docs/PRODUCT_DOCUMENTATION.md", "section": "roadmap"},
    "teacher-calendar-workspace": {"title": "Teacher Calendar Workspace", "path": "docs/TEACHER_CALENDAR_WORKSPACE.md", "section": "roadmap"},
    "production-readiness-audit": {"title": "Production Readiness Audit", "path": "docs/production-readiness-audit.md", "section": "roadmap"},
    "production-execution-plan": {"title": "Production Execution Plan", "path": "docs/production-execution-plan.md", "section": "roadmap"},
    "preview-action-audit": {"title": "Preview Action Audit", "path": "docs/PREVIEW_ACTION_AUDIT.md", "section": "roadmap"},
    "rbac-admin-module": {"title": "RBAC Admin Module", "path": "docs/RBAC_ADMIN_MODULE.md", "section": "roadmap"},
    "super-admin-configuration-center": {"title": "Super Admin Configuration Center", "path": "docs/SUPER_ADMIN_CONFIGURATION_CENTER.md", "section": "architecture"},
    "analytics-observability": {"title": "Analytics and Observability", "path": "docs/ANALYTICS_OBSERVABILITY.md", "section": "architecture"},
    "ux-interaction-standards": {"title": "UX Interaction Standards", "path": "docs/UX_INTERACTION_STANDARDS.md", "section": "architecture"},
    "mosaico-atlas": {"title": "Mosaico Atlas", "path": "docs/MOSAICO_ATLAS.md", "section": "architecture"},
    "architecture": {"title": "Architecture", "path": "docs/ARCHITECTURE.md", "section": "architecture"},
    "deployment-guide": {"title": "Deployment Guide", "path": "docs/DEPLOYMENT_GUIDE.md", "section": "architecture"},
    "operations-runbook": {"title": "Operations Runbook", "path": "docs/OPERATIONS_RUNBOOK.md", "section": "architecture"},
    "troubleshooting": {"title": "Troubleshooting", "path": "docs/TROUBLESHOOTING.md", "section": "architecture"},
    "database-schema": {"title": "Database Schema", "path": "docs/DATABASE_SCHEMA.md", "section": "data"},
    "database-standardization-plan": {"title": "Database Standardization Plan", "path": "docs/DATABASE_STANDARDIZATION_PLAN.md", "section": "data"},
    "phase-1-backfill-audit": {"title": "Phase 1 Backfill Audit", "path": "backend/backfill_standardization_phase1.sql", "section": "data"},
    "api-reference": {"title": "API Reference", "path": "docs/API_REFERENCE.md", "section": "data"},
    "environment-variables": {"title": "Environment Variables", "path": "docs/ENVIRONMENT_VARIABLES.md", "section": "configuration"},
    "backend-env-example": {"title": "Backend Env Example", "path": "backend/.env.example", "section": "configuration"},
    "technical-wiki": {"title": "Technical Wiki", "path": "docs/TECHNICAL_WIKI.md", "section": "configuration"},
}


def _technical_doc_payload(doc_id: str, include_content: bool = False) -> dict:
    doc = TECHNICAL_DOCS.get(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    path = (ROOT_DIR.parent / doc["path"]).resolve()
    repo_root = ROOT_DIR.parent.resolve()
    if not str(path).startswith(str(repo_root)):
        raise HTTPException(400, "Invalid document path")
    payload = {"id": doc_id, **doc}
    if include_content:
        payload["content"] = path.read_text(encoding="utf-8")
    return payload

# ---------- Seed data ----------
DEFAULT_PRODUCTS = [
    {"id": "trial", "slug": "trial-class", "name_en": "Trial Class", "name_es": "Clase de Prueba",
     "description_en": "A relaxed 30-minute conversation to meet, plan, and try a lesson.",
     "description_es": "Una conversación relajada de 30 minutos para conocernos y probar una clase.",
     "duration_min": 30, "sessions_included": 1, "price_usd": 9.00, "type": "trial", "popular": False},
    {"id": "single-30", "slug": "single-30", "name_en": "30-min Private Lesson", "name_es": "Clase Privada 30 min",
     "description_en": "Focused micro-session, perfect for busy weeks.",
     "description_es": "Microclase enfocada, ideal para semanas ocupadas.",
     "duration_min": 30, "sessions_included": 1, "price_usd": 18.00, "type": "single", "popular": False},
    {"id": "single-45", "slug": "single-45", "name_en": "45-min Private Lesson", "name_es": "Clase Privada 45 min",
     "description_en": "Balanced flow of conversation, grammar, and listening.",
     "description_es": "Flujo equilibrado de conversación, gramática y escucha.",
     "duration_min": 45, "sessions_included": 1, "price_usd": 26.00, "type": "single", "popular": True},
    {"id": "single-60", "slug": "single-60", "name_en": "60-min Private Lesson", "name_es": "Clase Privada 60 min",
     "description_en": "Deep dive into themes you choose with personalized homework.",
     "description_es": "Inmersión profunda en los temas que elijas con tareas personalizadas.",
     "duration_min": 60, "sessions_included": 1, "price_usd": 34.00, "type": "single", "popular": False},
    {"id": "pack-5", "slug": "pack-5", "name_en": "5-Lesson Pack (60 min)", "name_es": "Pack de 5 Clases (60 min)",
     "description_en": "Save 10%. Five 60-minute lessons, used at your pace.",
     "description_es": "Ahorra 10%. Cinco clases de 60 minutos, a tu ritmo.",
     "duration_min": 60, "sessions_included": 5, "price_usd": 153.00, "type": "package", "popular": False},
    {"id": "pack-10", "slug": "pack-10", "name_en": "10-Lesson Pack (60 min)", "name_es": "Pack de 10 Clases (60 min)",
     "description_en": "Save 15%. Ten 60-minute lessons. Best for steady progress.",
     "description_es": "Ahorra 15%. Diez clases de 60 minutos. Ideal para progreso constante.",
     "duration_min": 60, "sessions_included": 10, "price_usd": 289.00, "type": "package", "popular": True},
    {"id": "monthly", "slug": "monthly-plan", "name_en": "Monthly Plan — 8 lessons", "name_es": "Plan Mensual — 8 clases",
     "description_en": "Eight 60-minute lessons per month. Reschedule anytime.",
     "description_es": "Ocho clases de 60 minutos al mes. Reagenda cuando quieras.",
     "duration_min": 60, "sessions_included": 8, "price_usd": 240.00, "type": "subscription", "popular": False},
]

ATLAS_VOLUME_SEEDS = [
    (0, "Master Index & Decision Log", "Navigation layer for the entire Atlas.", "Super Admin", 40, "critical", ["index", "decisions", "standards"], [1, 3, 9], ["Executive Summary", "Glossary", "Acronyms", "Product Taxonomy", "Decision Log", "Cross-Reference Map", "Documentation Standards", "Review Cadence", "Ownership Matrix"]),
    (1, "Company Vision", "Company mission, values, operating principles, and long-term purpose.", "Founder", 30, "high", ["vision", "company", "strategy"], [3, 24], ["Mission", "Vision", "Values", "Principles", "Long-Term Strategy", "Brand Promise"]),
    (2, "Market Intelligence", "Market research, competitors, ICPs, and education category signals.", "Product Strategy", 45, "high", ["market", "competitors", "research"], [3, 14], ["Market Map", "Competitor Landscape", "Customer Segments", "Trends", "Opportunities", "Risks"]),
    (3, "Product Strategy", "Product direction, bets, sequencing, and platform evolution.", "Product", 60, "critical", ["product", "strategy", "roadmap"], [1, 4, 24], ["North Star", "Product Principles", "Roadmap", "Prioritization", "Launch Scope", "Metrics"]),
    (4, "Product Bible", "Canonical product behavior, modules, workflows, and domain model.", "Product", 90, "critical", ["product", "modules", "workflows"], [3, 5, 9, 12], ["Purpose", "Modules", "Student Platform", "Tutor Platform", "Teacher Platform", "Admin Platform", "Learning Economy", "Roadmap", "AI", "Analytics", "RBAC"]),
    (5, "UX Bible", "Experience principles, flows, navigation, interaction patterns, and accessibility.", "Design", 75, "high", ["ux", "flows", "accessibility"], [4, 19], ["UX Principles", "Navigation", "States", "Forms", "Modals", "Accessibility", "Responsive Rules"]),
    (6, "Learning Economy", "Credits, wallets, rewards, marketplace incentives, and anti-fraud rules.", "Product", 60, "critical", ["credits", "wallet", "economy"], [4, 13], ["Wallet", "Learning Credits", "Mosaic Coins", "Rewards", "Marketplace", "Referrals", "Coupons", "Anti-fraud"]),
    (7, "User Personas", "Detailed user profiles, jobs-to-be-done, needs, and permissions expectations.", "Product", 45, "high", ["personas", "students", "teachers"], [4, 5], ["Student", "Tutor Parent", "Teacher", "Coordinator", "Admin", "Super Admin", "Investor"]),
    (8, "Business Operations", "Operating model for school administration, support, and service delivery.", "Operations", 70, "high", ["operations", "support", "school"], [6, 13, 16], ["Operating Cadence", "Support", "Scheduling", "Teacher Ops", "Student Success", "Escalations"]),
    (9, "Technical Architecture", "System architecture, services, data flow, integration decisions, and constraints.", "Engineering", 85, "critical", ["architecture", "backend", "frontend"], [10, 20, 21, 22], ["System Map", "Frontend", "Backend", "Database", "Auth", "Storage", "Integrations", "Observability"]),
    (10, "Security", "Security model, auth, RBAC, audit, privacy, and incident response.", "Security", 70, "critical", ["security", "rbac", "audit"], [9, 21, 22], ["Threat Model", "Auth", "RBAC", "Audit Logs", "Data Protection", "Incident Response"]),
    (11, "AI Strategy", "AI tutor, internal copilots, safety model, prompts, and evaluation plan.", "Product", 45, "medium", ["ai", "tutor", "automation"], [3, 4, 10], ["AI Tutor", "Admin Copilots", "Prompt Standards", "Safety", "Evaluation", "Roadmap"]),
    (12, "Analytics", "Product analytics, operational metrics, dashboards, event taxonomy, and KPIs.", "Data", 55, "high", ["analytics", "metrics", "events"], [3, 8, 13], ["Event Catalog", "Dashboards", "KPIs", "Funnels", "Retention", "Data Quality"]),
    (13, "Financial Model", "Pricing, credits, revenue, costs, unit economics, and projections.", "Finance", 60, "high", ["finance", "pricing", "credits"], [6, 14, 23], ["Pricing", "Credit Economics", "Revenue", "Costs", "Teacher Payouts", "Forecasts"]),
    (14, "Go-To-Market", "Launch strategy, positioning, audiences, campaigns, and channels.", "Growth", 55, "high", ["gtm", "launch", "growth"], [2, 15, 17], ["Positioning", "Launch Plan", "Channels", "Campaigns", "Partnerships", "Metrics"]),
    (15, "Sales Playbook", "Sales process, scripts, objections, demos, and pipeline management.", "Sales", 40, "medium", ["sales", "pipeline", "playbook"], [14, 16], ["ICP", "Demo Script", "Objections", "Follow-up", "Pipeline", "Close Plan"]),
    (16, "Customer Success", "Onboarding, activation, retention, support, and learner success playbooks.", "Customer Success", 50, "high", ["success", "support", "retention"], [7, 8, 12], ["Onboarding", "Activation", "Retention", "Support", "Health Scores", "Escalations"]),
    (17, "Marketing", "Brand campaigns, content, email, social, and performance marketing.", "Marketing", 45, "medium", ["marketing", "content", "brand"], [14, 15], ["Brand Voice", "Content", "Email", "Social", "Paid", "SEO"]),
    (18, "Engineering Handbook", "Engineering standards, workflow, quality bar, code review, and releases.", "Engineering", 65, "high", ["engineering", "standards", "quality"], [9, 20, 22], ["Workflow", "Code Review", "Testing", "Frontend Standards", "Backend Standards", "Release Rules"]),
    (19, "Design System", "Design tokens, components, layout rules, visual standards, and accessibility.", "Design", 70, "high", ["design", "components", "ui"], [5, 18], ["Tokens", "Components", "Forms", "Tables", "Charts", "Accessibility", "Responsive"]),
    (20, "API Documentation", "API standards, endpoints, auth, errors, webhooks, and integration contracts.", "Engineering", 75, "high", ["api", "contracts", "backend"], [9, 18, 21], ["API Standards", "Auth", "Errors", "Admin API", "Webhooks", "Versioning"]),
    (21, "Database Bible", "Schema, data ownership, migrations, backfills, lineage, and data quality.", "Data", 80, "critical", ["database", "schema", "data"], [9, 10, 20], ["Schema", "Migrations", "Backfills", "Indexes", "Data Quality", "Access Rules"]),
    (22, "Deployment & DevOps", "Environment strategy, CI/CD, Render, Supabase, rollback, and operations.", "DevOps", 60, "critical", ["deployment", "devops", "render"], [9, 10, 18], ["Environments", "Render", "Supabase", "Secrets", "Deploy Flow", "Rollback", "Monitoring"]),
    (23, "Investor Relations", "Investor-ready story, metrics, financial narrative, and data room index.", "Founder", 45, "medium", ["investor", "fundraising", "data-room"], [1, 13, 24], ["Narrative", "Market", "Product", "Traction", "Financials", "Data Room"]),
    (24, "Future Vision", "Long-term platform vision, expansion bets, marketplace, AI, and ecosystem.", "Founder", 55, "medium", ["future", "vision", "strategy"], [1, 3, 11], ["10-Year Vision", "Marketplace", "AI", "Credentials", "Partnerships", "Expansion"]),
]

ATLAS_GLOSSARY_SEEDS = [
    ("Learning OS", "The operating system for organizing learning goals, credits, classes, feedback, and progress."),
    ("Learning Credits", "Spendable units used to book learning experiences inside MOSAICO."),
    ("Mosaic Coins", "Potential reward currency for engagement, referrals, or achievements."),
    ("Wallet", "The learner or family credit balance and transaction history."),
    ("Roadmap", "A structured learning path with milestones, levels, tests, and badges."),
    ("RBAC", "Role-Based Access Control with additive permissions."),
    ("Super Admin", "Technical governance role with full platform control."),
    ("Teacher Utilization", "Percentage of teacher availability converted into booked or completed classes."),
    ("Student Retention", "The rate at which students continue learning across time windows."),
    ("Learning Economy", "The credits, rewards, pricing, marketplace, and incentive model."),
    ("Marketplace", "Supply and demand layer connecting students with teachers or learning products."),
    ("Audit Log", "Immutable record of sensitive platform changes."),
    ("Activity Log", "Operational timeline for user-facing and support events."),
]

ATLAS_VOLUME_NARRATIVES = {
    0: "This volume is the control plane for the Atlas. It gives leaders one place to understand what documentation exists, who owns it, what decisions are active, and which volumes must be reviewed before a production or investor milestone.",
    1: "MOSAICO exists to make Spanish learning more structured, personal, measurable, and operationally reliable. The company vision connects live teaching, learning roadmaps, credits, parent visibility, and teacher operations into one education platform.",
    2: "MOSAICO sits at the intersection of private language tutoring, online education operations, parent-managed learning, and teacher marketplaces. Market intelligence should track demand signals, competitors, pricing pressure, and unmet needs.",
    3: "The product strategy is to move from polished MVP to a dependable learning platform. The sequence is foundation first: identity, RBAC, credits, scheduling, learning state, analytics, then marketplace and AI expansion.",
    4: "The Product Bible defines how the platform behaves. It is the canonical source for student, tutor, teacher, coordinator, admin, analytics, RBAC, and learning economy workflows.",
    5: "The UX Bible keeps MOSAICO usable as it grows. Operational SaaS screens should be quiet, dense, scannable, responsive, accessible, and honest about which actions persist.",
    6: "The Learning Economy defines how credits, wallets, rewards, referrals, pricing, discounts, and marketplace incentives work without creating financial or trust risk.",
    7: "Personas clarify what each role needs from MOSAICO: students learn, tutors guide, teachers deliver, coordinators operate, admins govern, and Super Admins protect the platform.",
    8: "Business Operations describes the day-to-day system required to run a real education service: scheduling, support, teacher standards, student success, credits, incidents, and escalation paths.",
    9: "Technical Architecture explains how React, FastAPI, Supabase, Render, Stripe, Google Calendar, RBAC, audit logs, analytics, and internal documentation fit together.",
    10: "Security is a product requirement, not an afterthought. MOSAICO must protect accounts, roles, credits, payments, student data, teacher operations, audit trails, and exports.",
    11: "AI Strategy should only advance where it improves learning or operations with clear safety, evaluation, and human override. Current AI surfaces are preview-oriented until guardrails are defined.",
    12: "Analytics turns product usage and operational health into decisions. MOSAICO tracks product events, activity logs, audit events, request IDs, and admin dashboards.",
    13: "The Financial Model connects class duration, credit pricing, teacher costs, subscriptions, retention, utilization, refunds, and growth assumptions into one operating view.",
    14: "Go-To-Market defines how MOSAICO reaches students, parents, teachers, and partners with a clear promise: structured Spanish learning with live support and measurable progress.",
    15: "The Sales Playbook turns positioning into repeatable conversations, demos, objections, follow-ups, and conversion processes for families, adult learners, and partner channels.",
    16: "Customer Success protects learning continuity. It covers onboarding, activation, progress follow-up, parent confidence, teacher feedback, retention signals, and support escalation.",
    17: "Marketing translates the product into trust-building stories, campaigns, content, email, social proof, SEO, and launch assets without overselling unfinished capabilities.",
    18: "The Engineering Handbook defines how the team builds safely: inspect first, preserve production, document changes, test risk, avoid dead buttons, and protect user data.",
    19: "The Design System keeps MOSAICO consistent across public pages, dashboards, admin tools, calendars, forms, tables, modals, states, and responsive layouts.",
    20: "API Documentation defines contract-first backend behavior: auth, permissions, errors, request IDs, logs, analytics, admin operations, webhooks, and future versioning.",
    21: "The Database Bible explains the data model and why it must evolve from flat MVP tables into normalized, auditable, ledger-grade platform data.",
    22: "Deployment and DevOps make the product operable: environments, Render deploys, Supabase config, migrations, backups, feature flags, smoke tests, and rollback.",
    23: "Investor Relations packages MOSAICO into a clear company narrative: market, product, traction, business model, financial model, risks, roadmap, and data room.",
    24: "Future Vision keeps long-term bets visible while preventing them from distracting from launch blockers. It covers marketplace, AI, credentials, partnerships, and scale.",
}

ATLAS_SECTION_RULES = {
    "Executive Summary": "Summarize the volume's purpose, decisions it influences, and what a leader should read first.",
    "Glossary": "List the terms this volume standardizes and link them to Atlas glossary records.",
    "Acronyms": "Define abbreviations used by product, engineering, operations, and business teams.",
    "Product Taxonomy": "Name the product domains: identity, learning, credits, scheduling, content, analytics, admin, and operations.",
    "Decision Log": "Capture approved, proposed, rejected, and superseded decisions with context and consequences.",
    "Cross-Reference Map": "Explain which Atlas volumes must be read together before making changes.",
    "Documentation Standards": "Require concrete language, owner, status, review cadence, version history, and decision links.",
    "Review Cadence": "Define how often this volume should be reviewed and who is accountable.",
    "Ownership Matrix": "Map responsibility across Super Admin, Admin, Coordinator, Teacher, Product, Engineering, and Operations.",
    "Mission": "Describe the durable reason MOSAICO exists for learners, families, teachers, and operators.",
    "Vision": "Describe the long-term platform ambition and the future learner experience.",
    "Values": "Document values that guide tradeoffs: trust, clarity, measurable learning, operational excellence, and responsible growth.",
    "Principles": "Define product and operating principles used to make everyday decisions.",
    "Long-Term Strategy": "Connect near-term launch work to a broader education platform and marketplace strategy.",
    "Brand Promise": "State what MOSAICO can credibly promise today and what should not be promised until built.",
    "Market Map": "Frame the market across language tutoring, education marketplaces, parent-managed learning, and SaaS operations.",
    "Competitor Landscape": "Track alternatives such as independent tutors, language apps, marketplaces, schools, and cohort programs.",
    "Customer Segments": "Define adult learners, parents, students, teachers, coordinators, administrators, and partners.",
    "Trends": "Track AI tutoring, hybrid live/asynchronous learning, skills proof, flexible payments, and parent visibility.",
    "Opportunities": "Identify high-value openings: structured live learning, family wallets, teacher utilization, and measurable progress.",
    "Risks": "Name business, security, data, operational, and UX risks before they become launch incidents.",
    "North Star": "Define the metric and behavior that prove MOSAICO is creating learning value.",
    "Product Principles": "Prioritize persisted workflows, permission safety, clear states, measurable progress, and honest previews.",
    "Roadmap": "Sequence the platform through foundation, credits, booking, scheduling, learning, analytics, and marketplace expansion.",
    "Prioritization": "Rank work by launch risk, learner value, operational leverage, data integrity, and revenue impact.",
    "Launch Scope": "Define what is allowed in MVP, alpha, beta, and production.",
    "Metrics": "Tie decisions to activation, class booking, completion, cancellation, retention, credits, utilization, and engagement.",
    "Purpose": "Explain why this product area exists and what user or business problem it owns.",
    "Modules": "List current and planned modules, separating production-backed flows from preview surfaces.",
    "Student Platform": "Define student roadmap, classes, credits, tests, practice, badges, progress, and feedback.",
    "Tutor Platform": "Define linked students, shared wallet, progress visibility, bookings, feedback, alerts, and communication.",
    "Teacher Platform": "Define availability, classes, students, materials, feedback, evaluations, earnings, and calendar health.",
    "Admin Platform": "Define user management, RBAC, credits, lessons, reports, analytics, configuration, logs, and Atlas.",
    "Learning Economy": "Define credits, wallet, rewards, pricing, marketplace incentives, and anti-fraud rules.",
    "AI": "Define AI tutor and operations assistant opportunities, guardrails, and evaluation requirements.",
    "Analytics": "Define event catalog, dashboards, activity logs, audit logs, request IDs, and product metrics.",
    "RBAC": "Define roles, additive permissions, protected roles, route enforcement, and backend authorization.",
    "UX Principles": "Make screens scannable, honest, accessible, responsive, and calm under operational load.",
    "Navigation": "Keep portal navigation role-aware, permission-aware, and free from broken links.",
    "States": "Every important action needs loading, success, error, empty, disabled, and confirmation states.",
    "Forms": "Forms require validation, useful labels, keyboard access, and clear error feedback.",
    "Modals": "Use modals for focused tasks and critical confirmations; do not hide required context.",
    "Accessibility": "Use semantic headings, focus states, ARIA labels where useful, sufficient contrast, and large tap targets.",
    "Responsive Rules": "Desktop can use panels; tablet collapses sidebars; mobile is list-first with large controls.",
    "Wallet": "Define balances, ownership, shared family use, ledger entries, grants, purchases, usage, refunds, and reconciliation.",
    "Learning Credits": "Define how class duration maps to credits and why ledger-grade accounting is required before launch.",
    "Mosaic Coins": "Describe reward currency as future-facing and separate from paid learning credits until policy is approved.",
    "Rewards": "Define safe reward mechanics tied to learning progress and retention, not opaque gamification.",
    "Marketplace": "Describe matching students with teachers or learning products by availability, level, goals, and quality.",
    "Referrals": "Define referral economics, anti-abuse controls, attribution, and support expectations.",
    "Coupons": "Define discount rules, campaign ownership, expiry, auditability, and revenue impact tracking.",
    "Anti-fraud": "Define controls for credit grants, refunds, coupons, referrals, account abuse, and suspicious usage.",
    "System Map": "Show how frontend, backend, database, auth, storage, payments, calendar, analytics, logs, and Atlas connect.",
    "Frontend": "Document React routes, admin shell, portals, UI states, API client, error boundary, and analytics client.",
    "Backend": "Document FastAPI routes, RBAC dependencies, seed jobs, database abstraction, audits, analytics, and settings.",
    "Database": "Document current tables, JSONB fields, indexes, seed data, and upcoming ledger/scheduling tables.",
    "Auth": "Document Supabase social login, local sessions, dev auth guardrails, roles, permissions, and session duration.",
    "Storage": "Document Supabase Storage usage, upload limits, MIME validation, and future attachment handling.",
    "Integrations": "Document Stripe, Google Calendar, Render, Supabase, and where mocks still exist.",
    "Observability": "Document request IDs, error_events, analytics_events, activity_logs, audit_events, and admin dashboards.",
    "Threat Model": "Identify risks around roles, payments, credits, student data, exports, calendar access, and support impersonation.",
    "Data Protection": "Define what data is sensitive, where it lives, who can access it, and how exports are controlled.",
    "Incident Response": "Define detection, triage, containment, communication, rollback, and post-incident documentation.",
    "Pricing": "Document placeholder pricing, credits per class duration, package strategy, subscriptions, and revenue assumptions.",
    "Credit Economics": "Track how credit price, teacher payout, cancellation policy, no-show policy, and utilization affect margin.",
    "Revenue": "Define revenue streams: classes, packs, subscriptions, premium teachers, partners, and future marketplace take-rate.",
    "Costs": "Track teacher compensation, platform tools, payment fees, support, marketing, and infrastructure.",
    "Teacher Payouts": "Define payout logic before earnings are production-visible.",
    "Forecasts": "Maintain model assumptions, scenarios, conversion rates, retention, utilization, and cash timing.",
    "Environments": "Define local, alpha, beta, and production rules for access, data, feature flags, deploys, and rollback.",
    "Render": "Document web/API services, build commands, env vars, deploy triggers, and operational limits.",
    "Supabase": "Document database, auth, storage, backups, connection strings, JWT settings, and service role handling.",
    "Secrets": "Define where secrets live, who can access them, and what must never be committed.",
    "Deploy Flow": "Require checks, review, smoke testing, monitoring, and rollback plan for production releases.",
    "Rollback": "Define code rollback, feature flag disablement, schema compatibility checks, and support comms.",
    "Monitoring": "Define what to watch after release: health, logs, request IDs, errors, audit events, payments, bookings.",
}


def _atlas_section_markdown(number: int, volume_title: str, section_title: str, description: str) -> str:
    narrative = ATLAS_VOLUME_NARRATIVES.get(number, description)
    rule = ATLAS_SECTION_RULES.get(section_title, f"Document how {section_title.lower()} works for {volume_title}.")
    return (
        f"## {section_title}\n\n"
        f"{narrative}\n\n"
        f"### Mosaico context\n"
        f"{rule}\n\n"
        f"### Current platform facts\n"
        f"- MOSAICO is a React, FastAPI, Supabase, Stripe, Render-based education platform.\n"
        f"- The current production foundation includes auth, RBAC, Super Admin configuration, audit logs, activity logs, analytics, error tracking, technical wiki, and Mosaico Atlas.\n"
        f"- Launch blockers are credit ledger, production booking lifecycle, teacher availability backend, Google Calendar connection, tutor/student scoping, and E2E smoke coverage.\n\n"
        f"### Operating guidance\n"
        f"- Keep this section concrete, decision-linked, and owned by the role responsible for {volume_title}.\n"
        f"- Separate approved behavior from draft strategy.\n"
        f"- When this section changes materially, create an Atlas version and link any decision record.\n"
    )


async def _ensure_atlas_rich_content(now: str) -> None:
    for number, title, description, owner_role, estimated_pages, priority, tags, linked_numbers, sections in ATLAS_VOLUME_SEEDS:
        volume_id = f"atlas-volume-{number:02d}"
        volume = await db.atlas_volumes.find_one({"id": volume_id}, {"_id": 0})
        if not volume:
            continue
        await db.atlas_volumes.update_one(
            {"id": volume_id},
            {"$set": {
                "description": description,
                "owner_role": owner_role,
                "estimated_pages": estimated_pages,
                "priority": priority,
                "tags": tags,
                "linked_volume_ids": [f"atlas-volume-{item:02d}" for item in linked_numbers],
                "purpose": description,
                "suggested_sections": sections,
                "updated_at": volume.get("updated_at") or now,
            }},
        )
        for order, section_title in enumerate(sections, start=1):
            section_id = f"atlas-section-{number:02d}-{order:02d}"
            existing = await db.atlas_sections.find_one({"id": section_id}, {"_id": 0})
            content = _atlas_section_markdown(number, title, section_title, description)
            section_doc = {
                "id": section_id,
                "volume_id": volume_id,
                "parent_section_id": None,
                "title": section_title,
                "slug": _slugify(section_title),
                "order_index": order,
                "summary": ATLAS_SECTION_RULES.get(section_title, f"{section_title} for {title}."),
                "content_markdown": content,
                "status": existing.get("status", "draft") if existing else "draft",
                "tags": tags[:2],
                "linked_decision_ids": existing.get("linked_decision_ids", []) if existing else [],
                "linked_glossary_terms": existing.get("linked_glossary_terms", []) if existing else [],
                "created_at": existing.get("created_at") if existing else now,
                "updated_at": now,
            }
            if existing:
                current = existing.get("content_markdown") or ""
                if "Replace this starter content" in current or "Starter section" in (existing.get("summary") or "") or not current.strip():
                    await db.atlas_sections.update_one({"id": section_id}, {"$set": section_doc})
            else:
                await db.atlas_sections.insert_one(section_doc)

DEFAULT_POSTS = [
    {"slug": "ser-vs-estar", "title_en": "Ser vs Estar: a kind, practical map",
     "title_es": "Ser vs Estar: un mapa amable y práctico",
     "excerpt_en": "Stop guessing. Here's the simple frame I teach in week one.",
     "excerpt_es": "Deja de adivinar. Aquí está el marco simple que enseño en la semana uno.",
     "body_en": "Most students panic about ser vs estar. The truth is, you only need two questions...\n\n1) Is it a quality that lives inside the thing? Use ser.\n2) Is it a temporary state, a location, or a feeling? Use estar.\n\nWe'll practice with your real-life sentences in your first class.",
     "body_es": "La mayoría entra en pánico con ser vs estar. La verdad es que solo necesitas dos preguntas...\n\n1) ¿Es una cualidad que vive dentro de la cosa? Usa ser.\n2) ¿Es un estado temporal, una ubicación o un sentimiento? Usa estar.\n\nPracticaremos con tus oraciones reales en tu primera clase.",
     "cover_image": "https://images.unsplash.com/photo-1573611030146-ff6916c398fa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwzfHxzcGFuaXNoJTIwY3VsdHVyZSUyMGFyY2hpdGVjdHVyZXxlbnwwfHx8fDE3ODEzNzE0MTR8MA&ixlib=rb-4.1.0&q=85"},
    {"slug": "five-phrases", "title_en": "Five phrases that make you sound fluent",
     "title_es": "Cinco frases que te hacen sonar fluido",
     "excerpt_en": "Tiny shifts that move you from textbook to local in one week.",
     "excerpt_es": "Pequeños cambios que te llevan del libro al local en una semana.",
     "body_en": "Try these in your next conversation:\n\n- '¿Qué onda?' (casual: what's up)\n- 'O sea...' (I mean...)\n- 'Vale, va.' (okay, let's go)\n- 'Está padrísimo.' (it's awesome — Mexico)\n- 'No manches.' (no way)\n\nWe practice slang depending on the country you care about most.",
     "body_es": "Prueba estas en tu próxima conversación:\n\n- '¿Qué onda?'\n- 'O sea...'\n- 'Vale, va.'\n- 'Está padrísimo.'\n- 'No manches.'\n\nPracticamos la jerga del país que más te interese.",
     "cover_image": "https://images.unsplash.com/photo-1505275350441-83dcda8eeef5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwzfHxwZW9wbGUlMjBsZWFybmluZyUyMHN0dWR5aW5nJTIwY29mZmVlJTIwc2hvcHxlbnwwfHx8fDE3ODEzNzE0MTR8MA&ixlib=rb-4.1.0&q=85"},
    {"slug": "consistency", "title_en": "The 20-minute habit that beats cramming",
     "title_es": "El hábito de 20 minutos que vence el atracón",
     "excerpt_en": "Why short, frequent sessions outperform marathon studying.",
     "excerpt_es": "Por qué las sesiones cortas y frecuentes superan a estudiar maratón.",
     "body_en": "Twenty focused minutes a day builds the neural pattern your brain needs to retrieve Spanish quickly. We design your weekly cadence in your first class — no guilt, no overwhelm.",
     "body_es": "Veinte minutos enfocados al día construyen el patrón neuronal que tu cerebro necesita para recuperar el español con rapidez. Diseñamos tu ritmo semanal en tu primera clase — sin culpa, sin agobio.",
     "cover_image": "https://images.unsplash.com/photo-1780672823934-1f6b7ebae149?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxjb21mb3J0YWJsZSUyMG1vZGVybiUyMGxpdmluZyUyMHJvb20lMjB3aXRoJTIwYm9va3N8ZW58MHx8fHwxNzgxMzcxNDIyfDA&ixlib=rb-4.1.0&q=85"},
]

@app.on_event("startup")
async def startup_database():
    global db
    _validate_production_config()
    db = await get_database()


@app.on_event("startup")
async def init_storage():
    await _ensure_storage_bucket()


@app.on_event("startup")
async def seed_data():
    now = _now_iso()
    for name, label in ROLE_LABELS.items():
        definition = ROLE_DEFINITIONS.get(name, {})
        role_doc = {
            "id": name, "name": name, "code": definition.get("code", name.upper()),
            "label": definition.get("name", label), "description": definition.get("description", label),
            "level": ROLE_LEVELS.get(name, 0), "type": "system", "status": "active", "active": True, "updated_at": now,
            "scope_type": definition.get("scope_type", "global" if name in ADMIN_ROLES else "self"),
            "is_system": True, "is_protected": bool(definition.get("is_protected", name == "administrador_sitio")),
        }
        if await db.roles.find_one({"name": name}, {"_id": 0}):
            await db.roles.update_one(
                {"name": name},
                {"$set": {key: value for key, value in role_doc.items() if key not in {"status", "active"}}},
            )
        else:
            await db.roles.insert_one({**role_doc, "created_at": now})
    for item in PERMISSION_CATALOG:
        name_parts = item["name"].split(".")
        doc = {
            **item,
            "id": item["name"],
            "code": item["name"],
            "description": item.get("description") or item["label"],
            "module": item.get("module") or item.get("catalog") or name_parts[0],
            "section": item.get("section") or item.get("feature") or (name_parts[1] if len(name_parts) > 1 else "general"),
            "risk_level": item.get("risk_level") or _permission_risk(item["name"]),
            "active": True,
            "is_system": True,
            "updated_at": now,
        }
        if await db.permissions.find_one({"name": item["name"]}, {"_id": 0}):
            await db.permissions.update_one(
                {"name": item["name"]},
                {"$set": {key: value for key, value in doc.items() if key != "active"}},
            )
        else:
            await db.permissions.insert_one({**doc, "created_at": now})
    for role, permissions in ROLE_PERMISSION_LEVELS.items():
        for permission, level in permissions.items():
            existing = await db.role_permissions.find_one({"role_name": role, "permission": permission}, {"_id": 0})
            default_scope = ROLE_GRANTS.get(role, {}).get(
                permission,
                "global" if role in ADMIN_ROLES else ROLE_DEFINITIONS.get(role, {}).get("scope_type", "self"),
            )
            doc = {
                "role_name": role, "permission": permission, "level": level,
                "scope": default_scope, "allowed": True, "conditions": {}, "updated_at": now,
            }
            if existing:
                # Persist administrator changes; startup seeding only fills
                # missing grants and never restores revoked permissions.
                continue
            else:
                await db.role_permissions.insert_one({"id": str(uuid.uuid4()), **doc, "created_at": now})
    logger.info("RBAC catalog ready")
    if await db.users.count_documents({}) == 0:
        sample_users = [
            ("seed-admin", "admin@mosaico.studio", "Admin MOSAICO", "administrador_sitio"),
            ("seed-editor", "editor@mosaico.studio", "Editor CMS", "editor_cms"),
            ("seed-teacher-1", "lily@mosaico.studio", "Lily Vargas", "profesor"),
            ("seed-teacher-2", "sofia@mosaico.studio", "Sofia Reyes", "profesor"),
            ("seed-student-1", "ana@example.com", "Ana Gomez", "alumno"),
            ("seed-student-2", "mark@example.com", "Mark Wilson", "alumno"),
            ("seed-student-3", "jules@example.com", "Jules Martin", "alumno"),
        ]
        for user_id, email, name, role in sample_users:
            await db.users.insert_one({
                "user_id": user_id, "google_id": user_id, "email": email, "name": name,
                "picture": "", "role": role, "active": True, "created_at": now, "updated_at": now,
            })
            await _sync_user_role(user_id, role)
        logger.info("Seeded sample users")
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many([dict(p) for p in DEFAULT_PRODUCTS])
        logger.info("Seeded products")
    if await db.blog_posts.count_documents({}) == 0:
        for p in DEFAULT_POSTS:
            doc = BlogPost(**p).model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.blog_posts.insert_one(doc)
        logger.info("Seeded blog posts")
    if await db.availability.count_documents({}) == 0:
        today = datetime.now(timezone.utc).date()
        slots = []
        for d_off in range(0, 21):
            day = today + timedelta(days=d_off)
            if day.weekday() == 6:  # closed Sunday
                continue
            for hour in [9, 10, 11, 14, 15, 16, 17, 18, 19]:
                slots.append({
                    "id": str(uuid.uuid4()),
                    "date": day.isoformat(),
                    "start_time": f"{hour:02d}:00",
                    "available": True,
                    "teacher_id": None,
                })
        await db.availability.insert_many(slots)
        logger.info("Seeded availability slots")
    if await db.teachers.count_documents({}) == 0:
        seed_t = Teacher(
            name="Lily Vargas",
            email="lily@mosaico.studio",
            bio_en="Founder & lead teacher. Seven years guiding students from first words to fluent conversations.",
            bio_es="Fundadora y profesora principal. Siete años guiando a estudiantes desde las primeras palabras hasta conversaciones fluidas.",
            picture="https://images.unsplash.com/photo-1590650213165-c1fef80648c4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxmcmllbmRseSUyMGhpc3BhbmljJTIwd29tYW4lMjB0ZWFjaGVyJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzgxMzcxNDE0fDA&ixlib=rb-4.1.0&q=85",
        )
        doc = seed_t.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.teachers.insert_one(dict(doc))
        logger.info("Seeded default teacher")
    if await db.student_profiles.count_documents({}) == 0:
        for user_id in ["seed-student-1", "seed-student-2", "seed-student-3"]:
            await db.student_profiles.insert_one({
                "id": f"sp_{user_id}", "user_id": user_id, "phone": "", "enrolled_products": [],
                "notes": "", "status": "activo", "created_at": now, "updated_at": now,
            })
        logger.info("Seeded student profiles")
    if await db.pages.count_documents({}) == 0:
        for title, slug in [("Inicio", "home"), ("Precios", "pricing"), ("Preguntas frecuentes", "faq"), ("Acerca de", "about")]:
            await db.pages.insert_one({
                "id": f"page_{slug}", "title": title, "slug": slug, "language": "es", "status": "published",
                "meta_title": f"{title} | MOSAICO", "meta_description": "Contenido público de MOSAICO",
                "content_blocks": [{"type": "text", "body": title}], "hero_image": "",
                "created_by": "seed-admin", "updated_by": "seed-admin", "published_date": now,
                "created_at": now, "updated_at": now,
            })
        logger.info("Seeded CMS pages")
    if await db.media_assets.count_documents({}) == 0:
        await db.media_assets.insert_one({
            "id": "media_hero", "file_name": "mosaico-hero.jpg",
            "url": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
            "type": "image", "alt_text": "Clase de espanol online", "uploaded_by": "seed-admin",
            "created_at": now, "updated_at": now,
        })
        logger.info("Seeded media library")
    if await db.bookings.count_documents({}) == 0:
        products = await db.products.find({}, {"_id": 0}).to_list(4)
        teacher = await db.teachers.find_one({}, {"_id": 0})
        for idx, student in enumerate(["seed-student-1", "seed-student-2", "seed-student-3"]):
            u = await db.users.find_one({"user_id": student}, {"_id": 0})
            p = products[idx % len(products)]
            await db.bookings.insert_one({
                "id": str(uuid.uuid4()), "user_id": student, "user_email": u["email"], "user_name": u["name"],
                "product_id": p["id"], "product_name": p["name_en"], "duration_min": p["duration_min"],
                "scheduled_date": (datetime.now(timezone.utc).date() + timedelta(days=idx + 1)).isoformat(),
                "scheduled_time": f"{10 + idx:02d}:00", "end_time": f"{11 + idx:02d}:00", "timezone": "America/Cancun",
                "status": ["scheduled", "completed", "cancelled"][idx], "meeting_link": "", "notes": "",
                "teacher_id": teacher.get("id") if teacher else None, "teacher_name": teacher.get("name") if teacher else None,
                "created_at": now, "updated_at": now,
            })
        logger.info("Seeded bookings")
    if await db.atlas_volumes.count_documents({}) == 0:
        number_to_id = {}
        for number, title, description, owner_role, estimated_pages, priority, tags, linked_numbers, sections in ATLAS_VOLUME_SEEDS:
            volume_id = f"atlas-volume-{number:02d}"
            number_to_id[number] = volume_id
            await db.atlas_volumes.insert_one({
                "id": volume_id,
                "number": number,
                "title": title,
                "slug": f"{number:02d}-{_slugify(title)}",
                "description": description,
                "owner_user_id": "seed-admin",
                "owner_role": owner_role,
                "status": "draft",
                "current_version": "0.1.0",
                "visibility": "super_admin_only" if number in {0, 10, 13, 23} else "internal",
                "estimated_pages": estimated_pages,
                "priority": priority,
                "tags": tags,
                "linked_volume_ids": [f"atlas-volume-{item:02d}" for item in linked_numbers],
                "purpose": description,
                "suggested_sections": sections,
                "created_at": now,
                "updated_at": now,
                "approved_at": None,
                "deprecated_at": None,
            })
            for order, section_title in enumerate(sections, start=1):
                await db.atlas_sections.insert_one({
                    "id": f"atlas-section-{number:02d}-{order:02d}",
                    "volume_id": volume_id,
                    "parent_section_id": None,
                    "title": section_title,
                    "slug": _slugify(section_title),
                    "order_index": order,
                    "summary": ATLAS_SECTION_RULES.get(section_title, f"{section_title} for {title}."),
                    "content_markdown": _atlas_section_markdown(number, title, section_title, description),
                    "status": "draft",
                    "tags": tags[:2],
                    "linked_decision_ids": [],
                    "linked_glossary_terms": [],
                    "created_at": now,
                    "updated_at": now,
                })
            await db.atlas_versions.insert_one({
                "id": f"atlas-version-{number:02d}-010",
                "volume_id": volume_id,
                "version": "0.1.0",
                "version_type": "minor",
                "change_summary": "Initial seeded Atlas starter volume.",
                "content_snapshot": {"title": title, "description": description, "suggested_sections": sections},
                "created_by_user_id": "seed-admin",
                "created_at": now,
            })
        logger.info("Seeded Mosaico Atlas volumes")
    await _ensure_atlas_rich_content(now)
    if await db.atlas_glossary_terms.count_documents({}) == 0:
        for term, definition in ATLAS_GLOSSARY_SEEDS:
            await db.atlas_glossary_terms.insert_one({
                "id": f"atlas-term-{_slugify(term)}",
                "term": term,
                "definition": definition,
                "related_terms": [],
                "linked_volume_ids": [],
                "created_at": now,
                "updated_at": now,
            })
        logger.info("Seeded Mosaico Atlas glossary")

# ---------- Routes ----------
@api.get("/")
async def root():
    return {"app": "Lily Spanish", "ok": True}


@api.get("/health")
async def health():
    checks = {
        "database": False,
        "storage_configured": _has_real_supabase_storage_config(),
        "strict_production_guards": _strict_production_guards_enabled(),
        "dev_auth_enabled": _dev_auth_enabled(),
    }
    try:
        await db.users.count_documents({})
        checks["database"] = True
    except Exception:
        checks["database"] = False
    return {"app": APP_NAME, "ok": checks["database"], "checks": checks}


@api.get("/version")
async def version():
    return {
        "app": APP_NAME,
        "commit": os.environ.get("RENDER_GIT_COMMIT") or os.environ.get("GIT_COMMIT") or "unknown",
        "build": os.environ.get("RENDER_SERVICE_NAME") or os.environ.get("APP_ENV") or "local",
    }


@api.post("/auth/register")
async def auth_register(payload: RegisterPayload, request: Request):
    email = payload.email.strip().lower()
    password = payload.password
    name = payload.name.strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    now = _now_iso()
    user_id = f"local-{uuid.uuid4()}"
    profile_type = _safe_profile_type(payload.profile_type)
    doc = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": "",
        "role": "alumno",
        "google_id": None,
        "password_hash": _hash_password(password),
        "auth_provider": "local",
        "profile_type": profile_type,
        "active": True,
        "created_at": now,
        "updated_at": now,
        "last_login_at": now,
    }
    await db.users.insert_one(doc)
    await _sync_user_role(user_id, "alumno")
    if profile_type in {"client", "student", "parent", "tutor"}:
        await db.student_profiles.insert_one({
            "id": f"sp_{user_id}",
            "user_id": user_id,
            "phone": "",
            "enrolled_products": [],
            "notes": f"Self-registered profile type: {profile_type}",
            "status": "activo",
            "created_at": now,
            "updated_at": now,
        })
    user = User(**doc)
    session = await _create_local_session(user, request)
    await _record_login(user_id, email, "local_password_register", request)
    await _record_audit_event(
        "auth.register",
        "user",
        entity_id=user_id,
        actor_user_id=user_id,
        target_user_id=user_id,
        metadata={"provider": "local", "profile_type": profile_type, "default_role": "alumno"},
        request=request,
    )
    user_doc = _public_user(user)
    user_doc["roles"] = await _effective_role_names(user)
    user_doc["permissions"] = await _effective_permission_levels(user)
    return {**session, "user": user_doc}


@api.post("/auth/login")
async def auth_login(payload: LocalAuthPayload, request: Request):
    email = payload.email.strip().lower()
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        await _record_audit_event(
            "auth.login.failed", "session", result="denied", denial_reason="invalid_credentials",
            metadata={"email_hash": hashlib.sha256(email.encode()).hexdigest()[:16]}, request=request,
            risk_level="high",
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user_doc.get("active") is False or user_doc.get("status", "active") != "active":
        await _record_audit_event(
            "auth.login.failed", "session", actor_user_id=user_doc["user_id"],
            target_user_id=user_doc["user_id"], result="denied", denial_reason="inactive_user",
            request=request, risk_level="high",
        )
        raise HTTPException(status_code=403, detail="User is inactive")
    if not _verify_password(payload.password, user_doc["password_hash"]):
        await _record_audit_event(
            "auth.login.failed", "session", actor_user_id=user_doc["user_id"],
            target_user_id=user_doc["user_id"], result="denied", denial_reason="invalid_credentials",
            request=request, risk_level="high",
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    now = _now_iso()
    await db.users.update_one({"user_id": user_doc["user_id"]}, {"$set": {"last_login_at": now, "updated_at": now}})
    user_doc = await db.users.find_one({"user_id": user_doc["user_id"]}, {"_id": 0})
    user = User(**user_doc)
    session = await _create_local_session(user, request)
    await _record_login(user.user_id, user.email, "local_password", request)
    await _record_audit_event(
        "auth.login",
        "session",
        entity_id=session.get("session_id"),
        actor_user_id=user.user_id,
        target_user_id=user.user_id,
        metadata={"provider": "local"},
        request=request,
    )
    await _record_analytics_event("user_logged_in", user=user, module="auth", entity_type="session", entity_id=session.get("session_id"), session_id=session.get("session_id"))
    public = _public_user(user)
    public["roles"] = await _effective_role_names(user)
    public["permissions"] = await _effective_permission_levels(user)
    return {**session, "user": public}


@api.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    doc = _public_user(user)
    doc["roles"] = await _effective_role_names(user)
    doc["permissions"] = await _effective_permission_levels(user)
    return doc


@api.get("/auth/me/permissions")
async def auth_me_permissions(user: User = Depends(get_current_user)):
    role_names = await _effective_role_names(user)
    role_assignments = await db.user_roles.find(
        {"user_id": user.user_id, "active": True, "status": "active"}, {"_id": 0}
    ).to_list(200)
    return {
        "userId": user.user_id,
        "roles": role_names,
        "schools": await _authorized_school_ids(user),
        "permissions": await _effective_permission_levels(user),
        "grants": await _effective_permission_grants(user),
        "assignments": [
            {
                "role": item.get("role_name"),
                "schoolId": item.get("school_id"),
                "status": item.get("status", "active"),
                "assignedBy": item.get("assigned_by"),
                "assignedAt": item.get("assigned_at") or item.get("created_at"),
                "expiresAt": item.get("expires_at"),
            }
            for item in role_assignments
        ],
    }

@api.post("/auth/logout")
async def auth_logout(request: Request, authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token.startswith(LOCAL_AUTH_TOKEN_PREFIX):
            session = await db.local_auth_sessions.find_one({"token_hash": _token_hash(token)}, {"_id": 0})
            await db.local_auth_sessions.update_one({"token_hash": _token_hash(token)}, {"$set": {"revoked_at": _now_iso()}})
            if session:
                await _record_audit_event(
                    "auth.logout",
                    "session",
                    entity_id=session.get("id"),
                    actor_user_id=session.get("user_id"),
                    target_user_id=session.get("user_id"),
                    metadata={"provider": "local"},
                    request=request,
                )
    return {"ok": True}

# ---- Products
@api.get("/products")
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).to_list(100)
    order = {"trial": 0, "single": 1, "package": 2, "subscription": 3}
    docs.sort(key=lambda p: (order.get(p["type"], 9), p["price_usd"]))
    return docs

@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p

# ---- Availability
@api.get("/availability")
async def get_availability(date: Optional[str] = None, teacher_id: Optional[str] = None):
    q: dict = {"available": True}
    if date:
        q["date"] = date
    if teacher_id:
        # show slots assigned to this teacher OR unassigned (open) slots
        q["$or"] = [{"teacher_id": teacher_id}, {"teacher_id": {"$exists": False}}, {"teacher_id": None}]
    slots = await db.availability.find(q, {"_id": 0}).to_list(1000)
    slots.sort(key=lambda s: (s["date"], s["start_time"]))
    return slots

@api.post("/admin/availability")
async def add_availability(payload: dict, _: User = Depends(require_permission("bookings:manage"))):
    slot = {
        "id": str(uuid.uuid4()),
        "date": payload["date"],
        "start_time": payload["start_time"],
        "available": True,
        "teacher_id": payload.get("teacher_id") or None,
    }
    await db.availability.insert_one(dict(slot))
    await _record_analytics_event("availability_created", user=_, module="calendar", entity_type="availability", entity_id=slot["id"], metadata={"date": slot["date"], "start_time": slot["start_time"], "teacher_id": slot.get("teacher_id")})
    await _record_activity_log("availability.created", "availability_created", "availability", "Availability slot opened.", actor_user_id=_.user_id, actor_name=_.name, target_id=slot["id"], metadata=slot)
    return slot

@api.delete("/admin/availability/{slot_id}")
async def delete_slot(slot_id: str, _: User = Depends(require_permission("bookings:manage"))):
    await db.availability.delete_one({"id": slot_id})
    return {"ok": True}

# ---- Payments
@api.post("/payments/checkout")
async def create_checkout(request: Request, payload: dict, user: User = Depends(get_current_user)):
    await authorize(
        user, "credits.purchase", request=request, resource_type="credit_purchase",
        resource_owner_id=user.user_id, school_id=user.active_school_id,
    )
    product_id = payload.get("product_id")
    origin = payload.get("origin_url")
    date = payload.get("date")
    time = payload.get("time")
    tz = payload.get("timezone", "UTC")
    teacher_id = payload.get("teacher_id") or None
    if not product_id or not origin:
        raise HTTPException(400, "product_id and origin_url required")
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Invalid product")

    teacher_name = None
    if teacher_id:
        teacher = await db.teachers.find_one({"id": teacher_id, "active": True}, {"_id": 0})
        if not teacher:
            raise HTTPException(400, "Invalid teacher")
        teacher_name = teacher["name"]

    stripe_key = await _get_stripe_key()
    if not stripe_key:
        raise HTTPException(500, "Stripe is not configured")
    stripe.api_key = stripe_key

    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/book/{product_id}"

    metadata = {
        "user_id": user.user_id,
        "user_email": user.email,
        "product_id": product_id,
        "date": date or "",
        "time": time or "",
        "timezone": tz,
        "teacher_id": teacher_id or "",
        "teacher_name": teacher_name or "",
    }
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": int(round(float(product["price_usd"]) * 100)),
                "product_data": {"name": product["name_en"]},
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": user.user_id,
        "user_email": user.email,
        "product_id": product_id,
        "amount": float(product["price_usd"]),
        "currency": "usd",
        "payment_status": "initiated",
        "status": "open",
        "metadata": metadata,
        "booking_created": False,
        "school_id": user.active_school_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.id}

@api.get("/payments/status/{session_id}")
async def payment_status(
    session_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Transaction not found")
    linked = bool(await db.tutor_student_links.find_one({
        "tutor_user_id": user.user_id,
        "student_user_id": txn.get("user_id"),
        "status": "active",
    }, {"_id": 0}))
    await authorize(
        user, "payments.view", request=request, resource_type="payment", resource_id=session_id,
        resource_owner_id=txn.get("user_id"), school_id=txn.get("school_id"), linked=linked,
    )

    stripe_key = await _get_stripe_key()
    if not stripe_key:
        raise HTTPException(500, "Stripe is not configured")
    stripe.api_key = stripe_key
    session = stripe.checkout.Session.retrieve(session_id)
    payment_state = session.payment_status or "unpaid"
    checkout_state = session.status or "open"

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": payment_state, "status": checkout_state}},
    )

    if payment_state == "paid" and not txn.get("booking_created"):
        meta = txn["metadata"]
        product = await db.products.find_one({"id": meta["product_id"]}, {"_id": 0})
        user = await db.users.find_one({"user_id": meta["user_id"]}, {"_id": 0})
        if product and user:
            booking = Booking(
                user_id=user["user_id"],
                user_email=user["email"],
                user_name=user.get("name", ""),
                product_id=product["id"],
                product_name=product["name_en"],
                duration_min=product["duration_min"],
                scheduled_date=meta.get("date", ""),
                scheduled_time=meta.get("time", ""),
                timezone=meta.get("timezone", "UTC"),
                teacher_id=meta.get("teacher_id") or None,
                teacher_name=meta.get("teacher_name") or None,
                payment_session_id=session_id,
            )
            doc = booking.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            doc["school_id"] = txn.get("school_id")
            await db.bookings.insert_one(doc)

            # Google Calendar: create event + send invite email
            try:
                gcal = await _create_gcal_event(doc, product)
                if gcal.get("meet_link"):
                    await db.bookings.update_one(
                        {"id": doc["id"]},
                        {"$set": {"meeting_link": gcal["meet_link"]}},
                    )
                    logger.info(f"gcal event created for booking {doc['id']}")
            except Exception as e:
                logger.warning(f"gcal event create error: {e}")
            # mark slot taken (prefer teacher-specific slot if available)
            if meta.get("date") and meta.get("time"):
                tslot = {"date": meta["date"], "start_time": meta["time"]}
                if meta.get("teacher_id"):
                    res = await db.availability.update_one(
                        {**tslot, "teacher_id": meta["teacher_id"]}, {"$set": {"available": False}}
                    )
                    if res.matched_count == 0:
                        await db.availability.update_one(
                            {**tslot, "$or": [{"teacher_id": None}, {"teacher_id": {"$exists": False}}]},
                            {"$set": {"available": False, "teacher_id": meta["teacher_id"]}},
                        )
                else:
                    await db.availability.update_one(tslot, {"$set": {"available": False}})
            await db.payment_transactions.update_one(
                {"session_id": session_id}, {"$set": {"booking_created": True}}
            )
            await _record_analytics_event("credits_purchased", user_id=user["user_id"], role=user.get("role"), module="credits", entity_type="payment", entity_id=session_id, metadata={"product_id": product["id"], "amount": txn.get("amount")})
            await _record_analytics_event("class_booked", user_id=user["user_id"], role=user.get("role"), module="booking", entity_type="booking", entity_id=doc["id"], metadata={"product_id": product["id"], "teacher_id": doc.get("teacher_id")})
            await _record_activity_log("class.booked", "class_booked", "booking", f"{user.get('name') or user.get('email')} booked {product['name_en']}.", actor_user_id=user["user_id"], actor_name=user.get("name") or user.get("email"), target_id=doc["id"], metadata={"product_id": product["id"], "teacher_id": doc.get("teacher_id")}, visibility="student")

    return {"payment_status": payment_state, "status": checkout_state,
            "amount_total": session.amount_total, "currency": session.currency}

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        stripe.api_key = await _get_stripe_key()
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        else:
            event = stripe.Event.construct_from(json.loads(body), stripe.api_key)
        data = event.get("data", {}).get("object", {})
        await db.payment_transactions.update_one(
            {"session_id": data.get("id", "")},
            {"$set": {"payment_status": data.get("payment_status", "unpaid")}},
        )
    except Exception as e:
        logger.warning(f"webhook err: {e}")
    return {"received": True}


@api.get("/finance/payments")
async def finance_payments(user: User = Depends(get_current_user)):
    scopes = await _permission_scopes(user, "payments.view")
    if "global" in scopes:
        rows = await db.payment_transactions.find({}, {"_id": 0}).to_list(2000)
    elif scopes & {"school", "multi_school"}:
        rows = []
        for school_id in await _authorized_school_ids(user):
            rows.extend(await db.payment_transactions.find({"school_id": school_id}, {"_id": 0}).to_list(2000))
    elif "self" in scopes:
        rows = await db.payment_transactions.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    else:
        raise HTTPException(403, "No tienes permisos para realizar esta acción.")
    rows.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    return rows


@api.patch("/finance/payments/{session_id}/{action}")
async def finance_payment_action(
    session_id: str,
    action: str,
    payload: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    permission = {
        "confirm": "payments.confirm",
        "reject": "payments.reject",
        "refund": "payments.refund",
    }.get(action)
    if not permission:
        raise HTTPException(400, "Unsupported payment action")
    payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not payment:
        raise HTTPException(404, "Payment not found")
    await authorize(
        user, permission, request=request, resource_type="payment", resource_id=session_id,
        resource_owner_id=payment.get("user_id"), school_id=payment.get("school_id"),
    )
    reason = str(payload.get("reason") or "").strip()
    if not reason:
        raise HTTPException(400, "A reason is required")
    if action == "refund" and payload.get("confirm") is not True:
        raise HTTPException(400, "Explicit refund confirmation is required")
    if payment.get("refunded_at") or payment.get("payment_status") == "refunded":
        raise HTTPException(409, "Payment has already been refunded")
    if action == "refund" and payment.get("payment_status") != "paid":
        raise HTTPException(409, "Only a confirmed payment can be refunded")
    if action in {"confirm", "reject"} and payment.get("status") not in {"open", "initiated"}:
        raise HTTPException(409, "Payment state does not allow this action")
    before = dict(payment)
    updates = {"updated_at": _now_iso()}
    if action == "confirm":
        updates.update({"payment_status": "paid", "status": "complete"})
    elif action == "reject":
        updates.update({"payment_status": "unpaid", "status": "rejected"})
    else:
        stripe_key = await _get_stripe_key()
        if not stripe_key:
            raise HTTPException(500, "Stripe is not configured")
        stripe.api_key = stripe_key
        checkout = stripe.checkout.Session.retrieve(session_id)
        if not getattr(checkout, "payment_intent", None):
            raise HTTPException(409, "Original Stripe payment is not refundable")
        stripe.Refund.create(
            payment_intent=checkout.payment_intent,
            reason="requested_by_customer",
            idempotency_key=f"mosaico-refund-{session_id}",
            metadata={"reason": reason, "actor_user_id": user.user_id},
        )
        updates.update({"payment_status": "refunded", "status": "refunded", "refunded_at": _now_iso()})
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": updates})
    after = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    await _record_audit_event(
        f"payment.{action}", "payment", entity_id=session_id, actor_user_id=user.user_id,
        school_id=payment.get("school_id"), permission_code=permission, before=before, after=after,
        metadata={"reason": reason}, request=request, risk_level="critical" if action == "refund" else "high",
    )
    return after


@api.get("/finance/credits/{account_user_id}/movements")
async def finance_credit_movements(
    account_user_id: str,
    school_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    linked = bool(await db.tutor_student_links.find_one({
        "tutor_user_id": user.user_id, "student_user_id": account_user_id,
        "school_id": school_id, "status": "active",
    }, {"_id": 0}))
    await authorize(
        user, "credits.view_movements", request=request, resource_type="credit_account",
        resource_id=account_user_id, resource_owner_id=account_user_id,
        school_id=school_id, linked=linked,
    )
    rows = await db.credit_movements.find(
        {"account_user_id": account_user_id, "school_id": school_id}, {"_id": 0}
    ).to_list(2000)
    rows.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    return rows


@api.post("/finance/credits/{account_user_id}/movements")
async def finance_adjust_credits(
    account_user_id: str,
    payload: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    school_id = payload.get("schoolId")
    movement_type = payload.get("type", "adjust")
    permission = {"add": "credits.add", "remove": "credits.remove", "adjust": "credits.adjust"}.get(movement_type)
    if not permission:
        raise HTTPException(400, "Invalid movement type")
    await authorize(
        user, permission, request=request, resource_type="credit_account",
        resource_id=account_user_id, school_id=school_id,
    )
    reason = str(payload.get("reason") or "").strip()
    transaction_id = str(payload.get("transactionId") or "").strip()
    if not reason or not transaction_id:
        raise HTTPException(400, "reason and transactionId are required")
    amount = float(payload.get("amount") or 0)
    if movement_type == "remove":
        amount = -abs(amount)
    if movement_type == "add":
        amount = abs(amount)
    movement_id = str(uuid.uuid4())
    created_at = _now_iso()
    metadata = payload.get("metadata") or {}
    async with db._pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT pg_advisory_xact_lock(hashtext($1))",
                f"{school_id}:{account_user_id}",
            )
            duplicate = await conn.fetchrow(
                "SELECT * FROM credit_movements WHERE transaction_id = $1",
                transaction_id,
            )
            if duplicate:
                return dict(duplicate)
            balance_before = float(await conn.fetchval(
                "SELECT COALESCE(SUM(amount), 0) FROM credit_movements WHERE account_user_id = $1 AND school_id = $2",
                account_user_id, school_id,
            ))
            balance_after = balance_before + amount
            if balance_after < 0:
                raise HTTPException(409, "Insufficient credit balance")
            row = await conn.fetchrow(
                """
                INSERT INTO credit_movements (
                    id, actor_user_id, account_user_id, school_id, balance_before, amount,
                    balance_after, movement_type, reason, transaction_id, reference_type,
                    reference_id, ip_address, metadata, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)
                RETURNING *
                """,
                movement_id, user.user_id, account_user_id, school_id, balance_before, amount,
                balance_after, movement_type, reason, transaction_id, payload.get("referenceType"),
                payload.get("referenceId"), request.client.host if request.client else None,
                json.dumps(metadata), created_at,
            )
            doc = dict(row)
    await _record_audit_event(
        "credits.movement", "credit_account", entity_id=account_user_id, actor_user_id=user.user_id,
        school_id=school_id, permission_code=permission, after=doc, request=request, risk_level="critical",
    )
    return doc

# ---- Bookings
@api.get("/bookings/me")
async def my_bookings(user: User = Depends(get_current_user)):
    docs = await db.bookings.find({"user_id": user.user_id}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda b: (b.get("scheduled_date", ""), b.get("scheduled_time", "")), reverse=True)
    return docs

@api.get("/admin/bookings")
async def all_bookings(user: User = Depends(get_current_user)):
    scopes = await _permission_scopes(user, "bookings.view")
    if "global" in scopes:
        docs = await db.bookings.find({}, {"_id": 0}).to_list(1000)
    elif scopes & {"school", "multi_school"}:
        docs = []
        for school_id in await _authorized_school_ids(user):
            docs.extend(await db.bookings.find({"school_id": school_id}, {"_id": 0}).to_list(1000))
    elif "assigned" in scopes:
        teacher = await db.teachers.find_one({"user_id": user.user_id}, {"_id": 0})
        docs = await db.bookings.find({"teacher_id": teacher.get("id")}, {"_id": 0}).to_list(1000) if teacher else []
    else:
        raise HTTPException(403, "No tienes permisos para realizar esta acción.")
    docs.sort(key=lambda b: (b.get("scheduled_date", ""), b.get("scheduled_time", "")), reverse=True)
    return docs

@api.patch("/admin/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    payload: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    allowed = {k: v for k, v in payload.items() if k in ("status", "meeting_link", "notes")}
    before = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Booking not found")
    permission = "bookings.cancel" if allowed.get("status") in {"cancelled", "canceled"} else \
        "bookings.reschedule" if allowed.get("status") == "rescheduled" else "classes.finish"
    teacher = await db.teachers.find_one({"user_id": user.user_id}, {"_id": 0})
    await authorize(
        user, permission, request=request, resource_type="booking", resource_id=booking_id,
        resource_owner_id=before.get("user_id"), school_id=before.get("school_id"),
        assigned=bool(teacher and before.get("teacher_id") == teacher.get("id")),
    )
    await db.bookings.update_one({"id": booking_id}, {"$set": allowed})
    after = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if before and allowed.get("status") and allowed.get("status") != before.get("status"):
        status_event = {
            "cancelled": "class_cancelled",
            "canceled": "class_cancelled",
            "completed": "class_completed",
            "complete": "class_completed",
            "rescheduled": "class_rescheduled",
        }.get(allowed.get("status"))
        if status_event:
            await _record_analytics_event(status_event, user=user, module="classes", entity_type="booking", entity_id=booking_id, metadata={"before_status": before.get("status"), "after_status": allowed.get("status")})
            await _record_activity_log(f"class.{allowed.get('status')}", status_event, "booking", f"Class status changed to {allowed.get('status')}.", actor_user_id=user.user_id, actor_name=user.name, target_id=booking_id, metadata={"before_status": before.get("status"), "after_status": allowed.get("status")}, visibility="admin")
    await _record_audit_event(
        "booking.update", "booking", entity_id=booking_id, actor_user_id=user.user_id,
        school_id=before.get("school_id"), permission_code=permission, before=before, after=after,
        request=request, risk_level=_permission_risk(permission),
    )
    return after

@api.get("/admin/students")
async def all_students(user: User = Depends(get_current_user)):
    docs = await _scoped_users(user, "students.view")
    docs = [item for item in docs if _normalize_role(item.get("role")) == "alumno"]
    for d in docs:
        d["booking_count"] = await db.bookings.count_documents({"user_id": d["user_id"]})
    return docs

@api.get("/admin/stats")
async def stats(_: User = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    active_students = await db.users.count_documents({"role": "alumno", "active": True})
    active_teachers = await db.teachers.count_documents({"active": True})
    total_products = await db.products.count_documents({})
    total_bookings = await db.bookings.count_documents({})
    upcoming = await db.bookings.count_documents({"status": "scheduled"})
    if upcoming == 0:
        upcoming = await db.bookings.count_documents({"status": "confirmed"})
    cms_pages = await db.pages.count_documents({"status": "published"})
    revenue_cursor = db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0, "amount": 1})
    revenue = 0.0
    async for t in revenue_cursor:
        revenue += float(t.get("amount", 0))
    recent = await db.bookings.find({}, {"_id": 0}).to_list(5)
    recent.sort(key=lambda b: b.get("created_at", ""), reverse=True)
    return {
        "users": total_users,
        "students": active_students,
        "teachers": active_teachers,
        "products": total_products,
        "bookings": total_bookings,
        "upcoming": upcoming,
        "cms_pages": cms_pages,
        "revenue_usd": revenue,
        "recent_bookings": recent,
    }

# ---- Blog
@api.get("/blog")
async def list_blog():
    docs = await db.blog_posts.find({"published": True}, {"_id": 0, "body_en": 0, "body_es": 0}).to_list(100)
    docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return docs

@api.get("/blog/{slug}")
async def get_blog(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc

# ---- Teachers
class Teacher(BaseModel):
    id: str = Field(default_factory=lambda: f"t_{uuid.uuid4().hex[:10]}")
    name: str
    email: str
    bio_en: str = ""
    bio_es: str = ""
    picture: str = ""
    languages: List[str] = Field(default_factory=lambda: ["es", "en"])
    specialties: List[str] = Field(default_factory=list)
    availability: List[dict] = Field(default_factory=list)
    user_id: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[str] = None


@api.get("/teachers")
async def list_teachers_public():
    docs = await db.teachers.find({"active": True}, {"_id": 0}).to_list(100)
    return docs


@api.get("/admin/teachers")
async def admin_list_teachers(_: User = Depends(require_permission("teachers:manage"))):
    docs = await db.teachers.find({}, {"_id": 0}).to_list(100)
    return docs


@api.post("/admin/teachers")
async def admin_create_teacher(payload: dict, _: User = Depends(require_permission("teachers:manage"))):
    if not payload.get("name") or not payload.get("email"):
        raise HTTPException(400, "name and email required")
    teacher = Teacher(**{k: v for k, v in payload.items() if k in {"name", "email", "bio_en", "bio_es", "picture", "languages", "specialties", "availability", "user_id", "active"}})
    doc = teacher.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = _now_iso()
    await db.teachers.insert_one(dict(doc))
    return doc


@api.patch("/admin/teachers/{teacher_id}")
async def admin_update_teacher(teacher_id: str, payload: dict, _: User = Depends(require_permission("teachers:manage"))):
    allowed = {k: v for k, v in payload.items() if k in ("name", "email", "bio_en", "bio_es", "picture", "languages", "specialties", "availability", "user_id", "active")}
    allowed["updated_at"] = _now_iso()
    await db.teachers.update_one({"id": teacher_id}, {"$set": allowed})
    return await db.teachers.find_one({"id": teacher_id}, {"_id": 0})


@api.delete("/admin/teachers/{teacher_id}")
async def admin_delete_teacher(teacher_id: str, _: User = Depends(require_permission("teachers:manage"))):
    await db.teachers.delete_one({"id": teacher_id})
    return {"ok": True}


# ---- Products CMS
_PRODUCT_FIELDS = {"id", "slug", "name_en", "name_es", "description_en", "description_es",
                   "duration_min", "sessions_included", "price_usd", "type", "popular",
                   "currency", "teacher_id", "capacity", "active", "image", "language"}


@api.post("/admin/products")
async def admin_create_product(payload: dict, _: User = Depends(require_permission("products:manage"))):
    for k in ("id", "slug", "name_en", "name_es", "duration_min", "price_usd", "type"):
        if payload.get(k) in (None, ""):
            raise HTTPException(400, f"{k} required")
    if await db.products.find_one({"id": payload["id"]}):
        raise HTTPException(400, "id exists")
    doc = {k: v for k, v in payload.items() if k in _PRODUCT_FIELDS}
    doc.setdefault("description_en", "")
    doc.setdefault("description_es", "")
    doc.setdefault("sessions_included", 1)
    doc.setdefault("popular", False)
    doc.setdefault("currency", "USD")
    doc.setdefault("capacity", 1)
    doc.setdefault("active", True)
    doc.setdefault("image", "")
    doc.setdefault("language", "es")
    doc["created_at"] = _now_iso()
    doc["updated_at"] = doc["created_at"]
    await db.products.insert_one(dict(doc))
    return await db.products.find_one({"id": doc["id"]}, {"_id": 0})


@api.patch("/admin/products/{product_id}")
async def admin_update_product(product_id: str, payload: dict, _: User = Depends(require_permission("products:manage"))):
    allowed = {k: v for k, v in payload.items() if k in _PRODUCT_FIELDS and k != "id"}
    allowed["updated_at"] = _now_iso()
    await db.products.update_one({"id": product_id}, {"$set": allowed})
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, _: User = Depends(require_permission("products:manage"))):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}


# ---- Blog CMS
_BLOG_FIELDS = {"slug", "title_en", "title_es", "excerpt_en", "excerpt_es",
                "body_en", "body_es", "cover_image", "published"}


@api.get("/admin/blog")
async def admin_list_blog(_: User = Depends(require_permission("cms:manage"))):
    docs = await db.blog_posts.find({}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return docs


@api.post("/admin/blog")
async def admin_create_blog(payload: dict, _: User = Depends(require_permission("cms:manage"))):
    for k in ("slug", "title_en", "title_es"):
        if payload.get(k) in (None, ""):
            raise HTTPException(400, f"{k} required")
    if await db.blog_posts.find_one({"slug": payload["slug"]}):
        raise HTTPException(400, "slug exists")
    post = BlogPost(
        slug=payload["slug"], title_en=payload["title_en"], title_es=payload["title_es"],
        excerpt_en=payload.get("excerpt_en", ""), excerpt_es=payload.get("excerpt_es", ""),
        body_en=payload.get("body_en", ""), body_es=payload.get("body_es", ""),
        cover_image=payload.get("cover_image", ""), published=bool(payload.get("published", True)),
    )
    doc = post.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.blog_posts.insert_one(dict(doc))
    return doc


@api.patch("/admin/blog/{slug}")
async def admin_update_blog(slug: str, payload: dict, _: User = Depends(require_permission("cms:manage"))):
    allowed = {k: v for k, v in payload.items() if k in _BLOG_FIELDS and k != "slug"}
    await db.blog_posts.update_one({"slug": slug}, {"$set": allowed})
    return await db.blog_posts.find_one({"slug": slug}, {"_id": 0})


@api.delete("/admin/blog/{slug}")
async def admin_delete_blog(slug: str, _: User = Depends(require_permission("cms:manage"))):
    await db.blog_posts.delete_one({"slug": slug})
    return {"ok": True}


# ---- Uploads (admin) and public file serving
@api.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), user: User = Depends(require_permission("media:manage"))):
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(400, "Empty file")
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(400, f"File too large (max {_MAX_UPLOAD_BYTES // 1024 // 1024} MB)")
    ct = (file.content_type or "").lower()
    if ct not in _ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported content type: {ct}")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else (ct.split("/")[-1] or "bin")
    path = f"{APP_NAME}/uploads/{user.user_id}/{uuid.uuid4().hex}.{ext}"
    try:
        result = await _put_object(path, data, ct)
    except Exception as e:
        logger.exception("upload failed")
        raise HTTPException(502, f"Storage error: {e}")
    file_id = str(uuid.uuid4())
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": ct,
        "size": result.get("size", len(data)),
        "uploaded_by": user.user_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "id": file_id,
        "path": result["path"],
        "url": result["public_url"],
        "size": result.get("size", len(data)),
        "content_type": ct,
    }


@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "File not found")
    try:
        data, ct = await _get_object(path)
    except Exception as e:
        logger.warning(f"file fetch err: {e}")
        raise HTTPException(404, "File not found")
    headers = {"Cache-Control": "public, max-age=86400"}
    return Response(content=data, media_type=record.get("content_type") or ct, headers=headers)



# ---- Users management
@api.get("/admin/users")
async def admin_list_users(user: User = Depends(get_current_user)):
    docs = await _scoped_users(user, "users.view")
    for d in docs:
        d["booking_count"] = await db.bookings.count_documents({"user_id": d["user_id"]})
        d["role"] = _normalize_role(d.get("role"))
        d["roles"] = await _active_user_roles(d["user_id"])
    docs.sort(key=lambda u: str(u.get("created_at", "")), reverse=True)
    return docs


@api.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, payload: dict, request: Request, current: User = Depends(get_current_user)):
    before = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not before:
        raise HTTPException(404, "User not found")
    await authorize(
        current, "users.update", request=request, resource_type="user", resource_id=user_id,
        resource_owner_id=user_id, school_id=before.get("active_school_id"),
    )
    allowed = {k: v for k, v in payload.items() if k in ("name", "picture", "active", "status")}
    if not allowed:
        raise HTTPException(400, "No editable fields supplied")
    if (allowed.get("active") is False or allowed.get("status") == "suspended") and user_id == current.user_id:
        raise HTTPException(400, "Cannot suspend your own account")
    target_roles = await _active_user_roles(user_id)
    if "administrador_sitio" in target_roles and (allowed.get("active") is False or allowed.get("status") == "suspended"):
        admin_assignments = await db.user_roles.find(
            {"role_name": "administrador_sitio", "active": True, "status": "active"}, {"_id": 0}
        ).to_list(1000)
        active_admin_ids = {
            item["user_id"] for item in admin_assignments
            if (await db.users.find_one({"user_id": item["user_id"], "active": True, "status": "active"}, {"_id": 0}))
        }
        if active_admin_ids == {user_id}:
            raise HTTPException(400, "Cannot suspend the last active global administrator")
    allowed["updated_at"] = _now_iso()
    await db.users.update_one({"user_id": user_id}, {"$set": allowed})
    if allowed.get("active") is False or allowed.get("status") == "suspended":
        sessions = await db.local_auth_sessions.find(
            {"user_id": user_id, "revoked_at": None}, {"_id": 0}
        ).to_list(1000)
        for session in sessions:
            await db.local_auth_sessions.update_one(
                {"id": session["id"]}, {"$set": {"revoked_at": _now_iso()}}
            )
    if "role" in allowed:
        await _sync_user_role(user_id, allowed["role"])
    after = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    changed_fields = [key for key in allowed if key != "updated_at" and (before or {}).get(key) != allowed.get(key)]
    if changed_fields:
        await _record_audit_event(
            "admin.user.update",
            "user",
            entity_id=user_id,
            actor_user_id=current.user_id,
            target_user_id=user_id,
            metadata={"changed_fields": changed_fields, "role": after.get("role"), "active": after.get("active")},
            request=request,
        )
    return after


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current: User = Depends(require_global_admin)):
    if user_id == current.user_id:
        raise HTTPException(400, "Cannot delete yourself")
    if "administrador_sitio" in await _active_user_roles(user_id):
        raise HTTPException(400, "Global administrator accounts must be reassigned before deletion")
    await db.users.delete_one({"user_id": user_id})
    return {"ok": True}


# ---- RBAC catalogue
@api.get("/admin/roles")
async def admin_roles(_: User = Depends(require_admin)):
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    for role in roles:
        assignments = await db.role_permissions.find({"role_name": role["name"]}, {"_id": 0}).to_list(200)
        role["permission_levels"] = {rp["permission"]: int(rp.get("level") or 1) for rp in assignments if int(rp.get("level") or 0) > 0}
        role["permissions"] = list(role["permission_levels"].keys())
    roles.sort(key=lambda r: ROLE_LEVELS.get(r["name"], 0), reverse=True)
    return roles


@api.get("/admin/rbac/catalog")
async def admin_rbac_catalog(_: User = Depends(require_permission("roles:manage"))):
    roles = await admin_roles(_)
    permissions = await db.permissions.find({}, {"_id": 0}).to_list(500)
    permissions.sort(key=lambda p: (p.get("catalog", ""), p.get("feature", ""), int(p.get("level") or 1), p.get("name", "")))
    return {
        "levels": [
            {"level": 1, "label": "View", "description": "Puede ver una funcionalidad."},
            {"level": 2, "label": "Operate", "description": "Puede operar datos propios o asignados."},
            {"level": 3, "label": "Create", "description": "Puede crear contenido o registros."},
            {"level": 4, "label": "Manage", "description": "Puede aprobar, editar y administrar."},
            {"level": 5, "label": "Govern", "description": "Puede gobernar roles, reglas y accesos."},
        ],
        "roles": roles,
        "permissions": permissions,
    }


@api.patch("/admin/roles/{role_name}/permissions")
async def admin_update_role_permissions(role_name: str, payload: dict, request: Request, user: User = Depends(require_global_admin)):
    role_name = _normalize_role(role_name)
    if not await db.roles.find_one({"name": role_name}, {"_id": 0}):
        raise HTTPException(404, "role not found")
    requested = payload.get("permissions", [])
    if not isinstance(requested, list):
        raise HTTPException(400, "permissions must be a list")
    now = _now_iso()
    requested_names = {
        item.get("permission") if isinstance(item, dict) else str(item)
        for item in requested
    }
    if role_name == "administrador_sitio" and "*" not in requested_names:
        raise HTTPException(400, "The protected admin role must retain global access")
    for item in requested:
        permission = item.get("permission") if isinstance(item, dict) else str(item)
        level = int(item.get("level", 1)) if isinstance(item, dict) else 1
        scope = item.get("scope", "global") if isinstance(item, dict) else "global"
        if scope not in {"self", "linked", "assigned", "school", "multi_school", "global"}:
            raise HTTPException(400, f"invalid scope: {scope}")
        level = max(1, min(level, 100))
        if not await db.permissions.find_one({"name": permission}, {"_id": 0}):
            raise HTTPException(400, f"invalid permission: {permission}")
        existing = await db.role_permissions.find_one({"role_name": role_name, "permission": permission}, {"_id": 0})
        doc = {
            "role_name": role_name, "permission": permission, "level": level, "scope": scope,
            "allowed": bool(item.get("allowed", True)) if isinstance(item, dict) else True,
            "conditions": item.get("conditions", {}) if isinstance(item, dict) else {},
            "updated_at": now,
        }
        if existing:
            await db.role_permissions.update_one({"role_name": role_name, "permission": permission}, {"$set": doc})
        else:
            await db.role_permissions.insert_one({"id": str(uuid.uuid4()), **doc, "created_at": now})
    existing_permissions = await db.role_permissions.find({"role_name": role_name}, {"_id": 0}).to_list(500)
    for assignment in existing_permissions:
        if assignment.get("permission") not in requested_names:
            await db.role_permissions.update_one(
                {"role_name": role_name, "permission": assignment.get("permission")},
                {"$set": {"level": 0, "updated_at": now}},
            )
    await _record_audit_event(
        "admin.role.permissions.update",
        "role",
        entity_id=role_name,
        actor_user_id=user.user_id,
        metadata={"permissions": sorted(requested_names)},
        request=request,
    )
    await _record_analytics_event("permission_modified", user=user, module="rbac", entity_type="role", entity_id=role_name, metadata={"permissions": sorted(requested_names)})
    return {"ok": True, "updated_by": user.user_id}


@api.patch("/admin/users/{user_id}/roles")
async def admin_update_user_roles(
    user_id: str,
    payload: dict,
    request: Request,
    user: User = Depends(get_current_user),
):
    requested = payload.get("roles", [])
    if not isinstance(requested, list) or not requested:
        raise HTTPException(400, "roles must be a non-empty list")
    if user_id == user.user_id:
        raise HTTPException(400, "Users cannot modify their own role assignments")
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")
    assignments = []
    for item in requested:
        role_name = _normalize_role(item.get("role") if isinstance(item, dict) else item)
        school_id = item.get("schoolId") if isinstance(item, dict) else None
        expires_at = item.get("expiresAt") if isinstance(item, dict) else None
        assignments.append({"role": role_name, "school_id": school_id, "expires_at": expires_at})
    roles = [item["role"] for item in assignments]
    invalid = []
    for role in roles:
        if not await db.roles.find_one({"name": role}, {"_id": 0}):
            invalid.append(role)
    if invalid:
        raise HTTPException(400, f"invalid roles: {', '.join(invalid)}")
    actor_scopes = await _permission_scopes(user, "roles.assign")
    if not actor_scopes:
        raise HTTPException(403, "No tienes permisos para realizar esta acción.")
    global_actor = "global" in actor_scopes
    authorized_schools = set(await _authorized_school_ids(user))
    for assignment in assignments:
        role_name = assignment["role"]
        school_id = assignment["school_id"]
        definition = ROLE_DEFINITIONS.get(role_name, {})
        if definition.get("scope_type") == "global" and not global_actor:
            raise HTTPException(403, "Only Admón can assign global roles")
        if role_name in {"administrador_sitio", "finanzas"} and not global_actor:
            raise HTTPException(403, "School administrators cannot assign this role")
        if not global_actor and (not school_id or school_id not in authorized_schools):
            raise HTTPException(403, "No tienes acceso a esta escuela.")
        if school_id and not await db.schools.find_one({"id": school_id, "status": "active"}, {"_id": 0}):
            raise HTTPException(400, "Invalid school assignment")
    previous_roles = await _active_user_roles(user_id)
    if "administrador_sitio" in previous_roles and "administrador_sitio" not in roles:
        active_admins = await db.user_roles.find(
            {"role_name": "administrador_sitio", "active": True, "status": "active"}, {"_id": 0}
        ).to_list(1000)
        if {item["user_id"] for item in active_admins} == {user_id}:
            raise HTTPException(400, "Cannot remove the last active global administrator")
    now = _now_iso()
    primary_role = sorted(set(roles), key=lambda role: ROLE_LEVELS.get(role, 0), reverse=True)[0]
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": primary_role, "updated_at": now}})
    for assignment in assignments:
        await _sync_user_role(
            user_id, assignment["role"], assigned_by=user.user_id,
            school_id=assignment["school_id"], expires_at=assignment["expires_at"],
        )
    existing = await db.user_roles.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    requested_keys = {(item["role"], item["school_id"]) for item in assignments}
    for assignment in existing:
        role = _normalize_role(assignment.get("role_name"))
        if (role, assignment.get("school_id")) not in requested_keys:
            await db.user_roles.update_one(
                {"id": assignment["id"]},
                {"$set": {"active": False, "status": "inactive", "updated_at": now}},
            )
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    updated["roles"] = await _effective_role_names(User(**updated))
    await _record_audit_event(
        "admin.user.roles.update",
        "user",
        entity_id=user_id,
        actor_user_id=user.user_id,
        target_user_id=user_id,
        metadata={"roles": updated["roles"], "primary_role": updated.get("role"), "assignments": assignments},
        permission_code="roles.assign",
        request=request,
    )
    await _record_analytics_event("role_assigned", user=user, module="rbac", entity_type="user", entity_id=user_id, metadata={"roles": updated["roles"], "primary_role": updated.get("role")})
    return updated


@api.get("/admin/rbac/roles")
async def admin_rbac_roles(_: User = Depends(require_permission("roles.view"))):
    roles = await db.roles.find({}, {"_id": 0}).to_list(200)
    payload = [await _role_payload(role) for role in roles]
    payload.sort(key=lambda item: (item.get("type") != "system", -int(item.get("level") or 0), item.get("label", "")))
    return payload


@api.get("/admin/rbac/roles/{role_name}/detail")
async def admin_rbac_role_detail(role_name: str, _: User = Depends(require_permission("roles.view"))):
    role = await db.roles.find_one({"name": _normalize_role(role_name)}, {"_id": 0})
    if not role:
        raise HTTPException(404, "Role not found")
    return await _role_payload(role, include_users=True, include_audit=True)


@api.post("/admin/rbac/roles")
async def admin_rbac_create_role(payload: dict, request: Request, user: User = Depends(require_global_admin)):
    name = (payload.get("name") or "").strip().lower().replace(" ", "_")
    if not name or not name.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(400, "Valid role name required")
    name = _normalize_role(name)
    if await db.roles.find_one({"name": name}, {"_id": 0}):
        raise HTTPException(400, "Role already exists")
    now = _now_iso()
    doc = {
        "id": name,
        "name": name,
        "code": (payload.get("code") or name.upper()).strip().upper(),
        "label": payload.get("label") or payload.get("name") or name,
        "description": payload.get("description") or "",
        "level": int(payload.get("level") or 20),
        "type": "custom",
        "scope_type": payload.get("scope_type") if payload.get("scope_type") in {"self", "linked", "assigned", "school", "multi_school", "global"} else "self",
        "is_system": False,
        "is_protected": False,
        "status": "active",
        "active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.roles.insert_one(doc)
    await _record_audit_event("rbac.role.create", "role", entity_id=name, actor_user_id=user.user_id, metadata={"after": doc}, request=request)
    return await _role_payload(doc)


@api.patch("/admin/rbac/roles/{role_name}")
async def admin_rbac_update_role(role_name: str, payload: dict, request: Request, user: User = Depends(require_global_admin)):
    role_name = _normalize_role(role_name)
    before = await db.roles.find_one({"name": role_name}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Role not found")
    if _role_type(role_name, before) == "system" and any(key in payload for key in ("name", "type")):
        raise HTTPException(400, "System role identity cannot be changed")
    allowed = {key: payload[key] for key in ("label", "description", "level") if key in payload}
    if "level" in allowed:
        allowed["level"] = int(allowed["level"])
    if not allowed:
        return await _role_payload(before)
    allowed["updated_at"] = _now_iso()
    await db.roles.update_one({"name": role_name}, {"$set": allowed})
    after = await db.roles.find_one({"name": role_name}, {"_id": 0})
    await _record_audit_event("rbac.role.update", "role", entity_id=role_name, actor_user_id=user.user_id, metadata={"before": before, "after": after}, request=request)
    return await _role_payload(after)


@api.post("/admin/rbac/roles/{role_name}/duplicate")
async def admin_rbac_duplicate_role(role_name: str, payload: dict, request: Request, user: User = Depends(require_global_admin)):
    source_name = _normalize_role(role_name)
    source = await db.roles.find_one({"name": source_name}, {"_id": 0})
    if not source:
        raise HTTPException(404, "Role not found")
    new_name = (payload.get("name") or f"{source_name}_copy").strip().lower().replace(" ", "_")
    if await db.roles.find_one({"name": new_name}, {"_id": 0}):
        raise HTTPException(400, "Role already exists")
    now = _now_iso()
    new_role = {
        **source, "id": new_name, "name": new_name, "code": new_name.upper(),
        "label": payload.get("label") or f"{source.get('label', source_name)} Copy",
        "type": "custom", "is_system": False, "is_protected": False,
        "status": "active", "active": True, "created_at": now, "updated_at": now,
    }
    await db.roles.insert_one(new_role)
    assignments = await db.role_permissions.find({"role_name": source_name}, {"_id": 0}).to_list(500)
    for assignment in assignments:
        if int(assignment.get("level") or 0) > 0:
            await db.role_permissions.insert_one({"id": str(uuid.uuid4()), "role_name": new_name, "permission": assignment["permission"], "level": int(assignment.get("level") or 1), "scope": assignment.get("scope") or "global", "created_at": now, "updated_at": now})
    await _record_audit_event("rbac.role.duplicate", "role", entity_id=new_name, actor_user_id=user.user_id, metadata={"source": source_name, "after": new_role}, request=request)
    return await _role_payload(new_role)


@api.patch("/admin/rbac/roles/{role_name}/status")
async def admin_rbac_role_status(role_name: str, payload: dict, request: Request, user: User = Depends(require_global_admin)):
    role_name = _normalize_role(role_name)
    role = await db.roles.find_one({"name": role_name}, {"_id": 0})
    if not role:
        raise HTTPException(404, "Role not found")
    requested_status = payload.get("status")
    if requested_status not in ("active", "inactive"):
        raise HTTPException(400, "status must be active or inactive")
    if role_name == "administrador_sitio" and requested_status != "active":
        raise HTTPException(400, "Super Admin role cannot be deactivated")
    if _role_type(role_name, role) == "system" and role_name in {"administrador_sitio"}:
        raise HTTPException(400, "Required system role cannot be deactivated")
    before = dict(role)
    active = requested_status == "active"
    await db.roles.update_one({"name": role_name}, {"$set": {"status": requested_status, "active": active, "updated_at": _now_iso()}})
    after = await db.roles.find_one({"name": role_name}, {"_id": 0})
    await _record_audit_event("rbac.role.status", "role", entity_id=role_name, actor_user_id=user.user_id, metadata={"before": before, "after": after}, request=request)
    return await _role_payload(after)


@api.delete("/admin/rbac/roles/{role_name}")
async def admin_rbac_delete_role(role_name: str, request: Request, user: User = Depends(require_global_admin)):
    role_name = _normalize_role(role_name)
    role = await db.roles.find_one({"name": role_name}, {"_id": 0})
    if not role:
        raise HTTPException(404, "Role not found")
    if _role_type(role_name, role) == "system":
        raise HTTPException(400, "System roles cannot be deleted")
    assigned = await db.user_roles.find({"role_name": role_name, "active": True}, {"_id": 0}).to_list(500)
    primary_users = await db.users.find({"role": role_name}, {"_id": 0}).to_list(500)
    assigned_user_ids = {assignment["user_id"] for assignment in assigned} | {item["user_id"] for item in primary_users}
    for assigned_user_id in assigned_user_ids:
        remaining = [item for item in await _active_user_roles(assigned_user_id) if item != role_name]
        if not remaining:
            raise HTTPException(400, "Cannot delete role because it would leave users without roles")
    for assignment in await db.role_permissions.find({"role_name": role_name}, {"_id": 0}).to_list(500):
        await db.role_permissions.delete_one({"id": assignment["id"]})
    await db.roles.delete_one({"name": role_name})
    await _record_audit_event("rbac.role.delete", "role", entity_id=role_name, actor_user_id=user.user_id, metadata={"before": role}, request=request)
    return {"ok": True}


@api.get("/admin/rbac/permissions")
async def admin_rbac_permissions(_: User = Depends(require_permission("roles.view"))):
    permissions = await db.permissions.find({"active": True}, {"_id": 0}).to_list(1000)
    permissions.sort(key=lambda item: (item.get("module", ""), item.get("section", ""), item.get("action", "")))
    grouped: Dict[str, Dict[str, List[dict]]] = {}
    for permission in permissions:
        module = permission.get("module") or permission.get("catalog") or "platform"
        section = permission.get("section") or permission.get("feature") or "general"
        grouped.setdefault(module, {}).setdefault(section, []).append(permission)
    return {"permissions": permissions, "grouped": grouped}


@api.patch("/admin/rbac/roles/{role_name}/permissions")
async def admin_rbac_update_role_permissions(role_name: str, payload: dict, request: Request, user: User = Depends(require_global_admin)):
    role_name = _normalize_role(role_name)
    role = await db.roles.find_one({"name": role_name}, {"_id": 0})
    if not role:
        raise HTTPException(404, "Role not found")
    requested = payload.get("permissions", [])
    if not isinstance(requested, list):
        raise HTTPException(400, "permissions must be a list")
    requested_names = {item.get("permission") if isinstance(item, dict) else str(item) for item in requested}
    existing_permissions = await db.role_permissions.find({"role_name": role_name}, {"_id": 0}).to_list(500)
    before_names = {item["permission"] for item in existing_permissions if int(item.get("level") or 0) > 0}
    changed = requested_names.symmetric_difference(before_names)
    if any(_permission_risk(permission) == "critical" for permission in changed) and not payload.get("confirmCritical"):
        raise HTTPException(400, "Critical permission changes require confirmation")
    return await admin_update_role_permissions(role_name, payload, request, user)


@api.get("/admin/rbac/users")
async def admin_rbac_users(_: User = Depends(require_permission("users.view"))):
    users = await admin_list_users(_)
    for item in users:
        user_model = User(**item)
        item["effective_permissions"] = await _effective_permission_levels(user_model)
        item["effective_permission_count"] = len(item["effective_permissions"])
        item["role_assignments"] = await db.user_roles.find(
            {"user_id": item["user_id"], "active": True, "status": "active"}, {"_id": 0}
        ).to_list(200)
    return users


@api.get("/admin/rbac/schools")
async def admin_rbac_schools(user: User = Depends(get_current_user)):
    scopes = await _permission_scopes(user, "users.view")
    if "global" in scopes:
        return await db.schools.find({"status": "active"}, {"_id": 0}).to_list(1000)
    rows = []
    for school_id in await _authorized_school_ids(user):
        school = await db.schools.find_one({"id": school_id, "status": "active"}, {"_id": 0})
        if school:
            rows.append(school)
    return rows


@api.get("/admin/users/{user_id}/effective-permissions")
async def admin_user_effective_permissions(
    user_id: str,
    _: User = Depends(require_global_admin),
):
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "User not found")
    target = User(**doc)
    assignments = await db.user_roles.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    grants = await _effective_permission_grants(target)
    return {
        "userId": user_id,
        "roles": await _effective_role_names(target),
        "schools": await _authorized_school_ids(target),
        "permissions": await _effective_permission_levels(target),
        "grants": grants,
        "denied": [],
        "origins": [
            {
                "role": item.get("role_name"),
                "schoolId": item.get("school_id"),
                "status": item.get("status", "active"),
                "active": item.get("active", True),
                "expiresAt": item.get("expires_at"),
            }
            for item in assignments
        ],
        "conflicts": [],
    }


@api.patch("/admin/rbac/users/{user_id}/roles")
async def admin_rbac_replace_user_roles(user_id: str, payload: dict, request: Request, user: User = Depends(get_current_user)):
    requested = [item for item in payload.get("roles", []) if item]
    if not requested:
        raise HTTPException(400, "Every user must have at least one role")
    names = [_normalize_role(item.get("role") if isinstance(item, dict) else item) for item in requested]
    if "administrador_sitio" in names and not payload.get("confirmPrivileged"):
        raise HTTPException(400, "Assigning Super Admin requires confirmation")
    return await admin_update_user_roles(user_id, {"roles": requested}, request, user)


@api.post("/admin/rbac/users/bulk-roles")
async def admin_rbac_bulk_roles(payload: dict, request: Request, user: User = Depends(get_current_user)):
    user_ids = payload.get("userIds", [])
    roles = payload.get("roles", [])
    mode = payload.get("mode", "assign")
    if not isinstance(user_ids, list) or not user_ids:
        raise HTTPException(400, "userIds required")
    if not isinstance(roles, list) or not roles:
        raise HTTPException(400, "roles required")
    updated = []
    for target_user_id in user_ids[:100]:
        current_roles = await _active_user_roles(target_user_id)
        next_roles = set(current_roles)
        normalized = {_normalize_role(role) for role in roles}
        if mode == "replace":
            next_roles = normalized
        elif mode == "remove":
            next_roles = next_roles - normalized
        else:
            next_roles = next_roles | normalized
        if not next_roles:
            raise HTTPException(400, f"Bulk action would leave {target_user_id} without roles")
        result = await admin_rbac_replace_user_roles(target_user_id, {"roles": sorted(next_roles), "confirmPrivileged": payload.get("confirmPrivileged", False)}, request, user)
        updated.append(result["user_id"])
    await _record_audit_event("rbac.user_roles.bulk", "user_role", actor_user_id=user.user_id, metadata={"user_ids": updated, "roles": roles, "mode": mode}, request=request)
    return {"ok": True, "updated": updated}


@api.get("/admin/rbac/audit-logs")
async def admin_rbac_audit_logs(_: User = Depends(require_permission("audit.logs.view"))):
    events = await db.audit_events.find({}, {"_id": 0}).to_list(500)
    events = [event for event in events if str(event.get("event_type", "")).startswith(("rbac.", "admin.role", "admin.user.roles"))]
    events.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    return events[:200]


@api.get("/audit")
async def scoped_audit_logs(user: User = Depends(get_current_user)):
    scopes = await _permission_scopes(user, "audit.view")
    if not scopes:
        raise HTTPException(403, "No tienes permisos para realizar esta acción.")
    roles = set(await _effective_role_names(user))
    async with db._pool.acquire() as conn:
        if "global" in scopes:
            rows = await conn.fetch("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 1000")
        else:
            school_ids = await _authorized_school_ids(user)
            if not school_ids:
                return []
            if "finanzas" in roles and "administrador_sitio" not in roles:
                rows = await conn.fetch(
                    """
                    SELECT * FROM audit_events
                    WHERE school_id = ANY($1::text[])
                      AND (
                        permission_code LIKE 'payments.%'
                        OR permission_code LIKE 'credits.%'
                        OR permission_code LIKE 'reports.financial.%'
                      )
                    ORDER BY created_at DESC LIMIT 1000
                    """,
                    school_ids,
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM audit_events WHERE school_id = ANY($1::text[]) ORDER BY created_at DESC LIMIT 1000",
                    school_ids,
                )
    return [dict(row) for row in rows]


@api.get("/admin/audit-logs")
async def admin_audit_logs(
    q: Optional[str] = None,
    risk: Optional[str] = None,
    actor: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    offset: int = 0,
    limit: int = 100,
    _: User = Depends(require_permission("audit.logs.view")),
):
    rows = await db.audit_events.find({}, {"_id": 0}).to_list(1000)
    if risk and risk != "all":
        rows = [row for row in rows if row.get("risk_level") == risk]
    if actor:
        rows = [row for row in rows if actor.lower() in str(row.get("actor_name") or row.get("actor_user_id") or "").lower()]
    if action:
        rows = [row for row in rows if action.lower() in str(row.get("action") or row.get("event_type") or "").lower()]
    if date_from:
        rows = [row for row in rows if str(row.get("created_at", "")) >= date_from]
    if date_to:
        rows = [row for row in rows if str(row.get("created_at", "")) <= date_to]
    if q:
        needle = q.lower()
        rows = [row for row in rows if needle in " ".join(str(row.get(key, "")) for key in ("event_type", "action", "entity_type", "entity_id", "target_id", "actor_name", "actor_user_id")).lower()]
    rows.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    total = len(rows)
    start = max(0, offset)
    end = start + max(1, min(limit, 500))
    return {"items": rows[start:end], "total": total, "offset": start, "limit": max(1, min(limit, 500))}


@api.get("/admin/activity-logs")
async def admin_activity_logs(
    q: Optional[str] = None,
    actor: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    offset: int = 0,
    limit: int = 100,
    user: User = Depends(require_permission("logs.activity.view", 4)),
):
    rows = await db.activity_logs.find({}, {"_id": 0}).to_list(1000)
    roles = await _effective_role_names(user)
    if "administrador_sitio" not in roles and "administrador_profesor" not in roles:
        rows = [row for row in rows if row.get("actor_user_id") == user.user_id or row.get("visibility") in {"teacher", "student", "tutor"}]
    if actor:
        rows = [row for row in rows if actor.lower() in str(row.get("actor_name") or row.get("actor_user_id") or "").lower()]
    if action:
        rows = [row for row in rows if action.lower() in str(row.get("action") or row.get("event_type") or "").lower()]
    if target_type and target_type != "all":
        rows = [row for row in rows if row.get("target_type") == target_type]
    if date_from:
        rows = [row for row in rows if str(row.get("created_at", "")) >= date_from]
    if date_to:
        rows = [row for row in rows if str(row.get("created_at", "")) <= date_to]
    if q:
        needle = q.lower()
        rows = [row for row in rows if needle in " ".join(str(row.get(key, "")) for key in ("event_type", "action", "target_type", "target_id", "summary", "actor_name")).lower()]
    rows.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    total = len(rows)
    start = max(0, offset)
    end = start + max(1, min(limit, 500))
    return {"items": rows[start:end], "total": total, "offset": start, "limit": max(1, min(limit, 500))}


class AnalyticsEventPayload(BaseModel):
    eventName: str
    module: Optional[str] = None
    entityType: Optional[str] = None
    entityId: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    sessionId: Optional[str] = None


@api.post("/analytics/events")
async def create_analytics_event(payload: AnalyticsEventPayload, user: User = Depends(get_current_user)):
    await _record_analytics_event(
        payload.eventName,
        user=user,
        module=payload.module,
        entity_type=payload.entityType,
        entity_id=payload.entityId,
        metadata=payload.metadata,
        session_id=payload.sessionId,
    )
    return {"ok": True}


@api.get("/admin/analytics/overview")
async def admin_analytics_overview(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    role: Optional[str] = None,
    teacher_id: Optional[str] = None,
    student_id: Optional[str] = None,
    status: Optional[str] = None,
    module: Optional[str] = None,
    _: User = Depends(require_permission("reports.analytics.view")),
):
    def in_range(item: dict, field: str = "created_at") -> bool:
        value = str(item.get(field) or "")
        return (not date_from or value >= date_from) and (not date_to or value <= date_to)

    bookings = [b for b in await db.bookings.find({}, {"_id": 0}).to_list(5000) if in_range(b)]
    if teacher_id and teacher_id != "all":
        bookings = [b for b in bookings if b.get("teacher_id") == teacher_id]
    if student_id and student_id != "all":
        bookings = [b for b in bookings if b.get("user_id") == student_id]
    if status and status != "all":
        bookings = [b for b in bookings if b.get("status") == status]

    events = [e for e in await db.analytics_events.find({}, {"_id": 0}).to_list(5000) if in_range(e)]
    if role and role != "all":
        events = [e for e in events if e.get("role") == role]
    if module and module != "all":
        events = [e for e in events if e.get("module") == module]

    payments = [p for p in await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0}).to_list(5000) if in_range(p)]
    availability = await db.availability.find({}, {"_id": 0}).to_list(5000)
    availability = [s for s in availability if (not date_from or str(s.get("date") or "") >= date_from) and (not date_to or str(s.get("date") or "") <= date_to)]
    if teacher_id and teacher_id != "all":
        availability = [s for s in availability if s.get("teacher_id") == teacher_id]

    completed = [b for b in bookings if b.get("status") in {"completed", "complete"}]
    cancelled = [b for b in bookings if b.get("status") in {"cancelled", "canceled"}]
    no_show = [b for b in bookings if b.get("status") in {"no_show", "no-show"}]
    active_users = len({e.get("user_id") for e in events if e.get("user_id")})
    empty_slots = len([s for s in availability if s.get("available") is True])
    booked_slots = max(0, len(availability) - empty_slots)
    teacher_utilization = round((booked_slots / len(availability)) * 100, 1) if availability else 0

    event_counts: Dict[str, int] = {}
    module_counts: Dict[str, int] = {}
    for event in events:
        event_name = event.get("event_name") or "unknown"
        module_name = event.get("module") or "unknown"
        event_counts[event_name] = event_counts.get(event_name, 0) + 1
        module_counts[module_name] = module_counts.get(module_name, 0) + 1

    teacher_counts: Dict[str, dict] = {}
    for booking in bookings:
        key = booking.get("teacher_id") or "unassigned"
        item = teacher_counts.setdefault(key, {"teacher_id": key, "teacher_name": booking.get("teacher_name") or "Unassigned", "classes": 0, "completed": 0})
        item["classes"] += 1
        if booking.get("status") in {"completed", "complete"}:
            item["completed"] += 1

    users = await db.users.find({}, {"_id": 0}).to_list(5000)
    students_with_unused_credits = [
        {"user_id": u.get("user_id"), "name": u.get("name"), "email": u.get("email"), "estimated_unused_credits": max(0, int(u.get("credits", 0) or 0))}
        for u in users
        if _normalize_role(u.get("role")) in {"alumno", "tutor_padre"} and int(u.get("credits", 0) or 0) > 0
    ][:20]

    recent_activity = await db.activity_logs.find({}, {"_id": 0}).to_list(20)
    recent_activity.sort(key=lambda row: str(row.get("created_at", "")), reverse=True)

    return {
        "metrics": {
            "active_users": active_users,
            "classes_booked": len(bookings),
            "classes_completed": len(completed),
            "cancellation_rate": round((len(cancelled) / len(bookings)) * 100, 1) if bookings else 0,
            "no_show_rate": round((len(no_show) / len(bookings)) * 100, 1) if bookings else 0,
            "credits_purchased": sum(int(p.get("metadata", {}).get("credits") or 0) for p in payments),
            "credits_used": len(bookings) * 2,
            "teacher_utilization": teacher_utilization,
            "student_engagement": round((len(events) / max(1, len(users))) * 100, 1),
            "empty_slots": empty_slots,
            "booking_conversion": round((event_counts.get("class_booked", 0) / max(1, event_counts.get("dashboard_viewed", 0))) * 100, 1),
        },
        "feature_usage": sorted([{"name": k, "count": v} for k, v in event_counts.items()], key=lambda item: item["count"], reverse=True),
        "module_usage": sorted([{"name": k, "count": v} for k, v in module_counts.items()], key=lambda item: item["count"], reverse=True),
        "top_teachers": sorted(teacher_counts.values(), key=lambda item: item["classes"], reverse=True)[:10],
        "students_with_unused_credits": students_with_unused_credits,
        "recent_activity": recent_activity,
    }


def _next_semver(version: str, version_type: str) -> str:
    try:
        major, minor, patch = [int(item) for item in (version or "0.1.0").split(".")[:3]]
    except ValueError:
        major, minor, patch = 0, 1, 0
    if version_type == "major":
        return f"{major + 1}.0.0"
    if version_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    return f"{major}.{minor + 1}.0"


async def _atlas_volume_payload(volume: dict) -> dict:
    sections = await db.atlas_sections.find({"volume_id": volume["id"]}, {"_id": 0}).to_list(500)
    versions = await db.atlas_versions.find({"volume_id": volume["id"]}, {"_id": 0}).to_list(100)
    reviews = await db.atlas_reviews.find({"volume_id": volume["id"]}, {"_id": 0}).to_list(100)
    comments = await db.atlas_comments.find({"volume_id": volume["id"]}, {"_id": 0}).to_list(100)
    audit = await db.atlas_audit_logs.find({"target_id": volume["id"]}, {"_id": 0}).to_list(50)
    sections.sort(key=lambda item: int(item.get("order_index") or 0))
    versions.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    audit.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    return {**volume, "sections": sections, "versions": versions, "reviews": reviews, "comments": comments, "audit": audit}


async def _atlas_can_manage(user: User) -> bool:
    return await _has_permission(user, "atlas.manage", 5)


@api.get("/admin/atlas")
async def admin_atlas_index(user: User = Depends(require_permission("atlas.view", 3))):
    volumes = await db.atlas_volumes.find({}, {"_id": 0}).to_list(500)
    can_manage = await _atlas_can_manage(user)
    if not can_manage:
        volumes = [volume for volume in volumes if volume.get("status") == "approved"]
    decisions = await db.atlas_decision_logs.find({}, {"_id": 0}).to_list(500)
    reviews = await db.atlas_reviews.find({}, {"_id": 0}).to_list(500)
    glossary = await db.atlas_glossary_terms.find({}, {"_id": 0}).to_list(500)
    audit = await db.atlas_audit_logs.find({}, {"_id": 0}).to_list(200)
    settings = (await _get_settings()).get("atlas_settings") or {
        "default_visibility": "internal",
        "review_required": True,
        "required_approvers": 1,
        "versioning_policy": "semantic",
        "export_formats_enabled": ["markdown", "json"],
        "investor_export_mode": "approved_only",
        "auto_generate_toc": True,
        "require_decision_log_for_major_changes": True,
        "owner_matrix": {},
    }
    volumes.sort(key=lambda item: int(item.get("number") or 0))
    audit.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    metrics = {
        "total_volumes": len(volumes),
        "approved_volumes": len([item for item in volumes if item.get("status") == "approved"]),
        "in_review": len([item for item in volumes if item.get("status") == "review"]),
        "drafts": len([item for item in volumes if item.get("status") == "draft"]),
        "deprecated": len([item for item in volumes if item.get("status") == "deprecated"]),
        "open_decisions": len([item for item in decisions if item.get("status") in {"proposed", "approved"}]),
        "pending_reviews": len([item for item in reviews if item.get("status") == "pending"]),
    }
    return {"volumes": volumes, "decisions": decisions, "reviews": reviews, "glossary": glossary, "audit": audit[:100], "settings": settings, "metrics": metrics, "canManage": can_manage}


@api.get("/admin/atlas/search")
async def admin_atlas_search(q: str = "", user: User = Depends(require_permission("atlas.view", 3))):
    needle = q.lower().strip()
    payload = await admin_atlas_index(user)
    results = []
    for volume in payload["volumes"]:
        haystack = " ".join([volume.get("title", ""), volume.get("description", ""), " ".join(volume.get("tags") or [])]).lower()
        if needle and needle in haystack:
            results.append({"type": "volume", "title": volume["title"], "snippet": volume.get("description"), "volume": volume["title"], "slug": volume["slug"], "status": volume.get("status"), "updated_at": volume.get("updated_at")})
    sections = await db.atlas_sections.find({}, {"_id": 0}).to_list(1000)
    for section in sections:
        haystack = " ".join([section.get("title", ""), section.get("summary", ""), section.get("content_markdown", "")]).lower()
        if needle and needle in haystack:
            results.append({"type": "section", "title": section["title"], "snippet": section.get("summary"), "volumeId": section.get("volume_id"), "status": section.get("status"), "updated_at": section.get("updated_at")})
    for decision in payload["decisions"]:
        haystack = " ".join([decision.get("title", ""), decision.get("context", ""), decision.get("decision", "")]).lower()
        if needle and needle in haystack:
            results.append({"type": "decision", "title": decision["title"], "snippet": decision.get("decision"), "status": decision.get("status"), "updated_at": decision.get("updated_at")})
    for term in payload["glossary"]:
        haystack = " ".join([term.get("term", ""), term.get("definition", "")]).lower()
        if needle and needle in haystack:
            results.append({"type": "glossary", "title": term["term"], "snippet": term.get("definition"), "updated_at": term.get("updated_at")})
    return {"items": results[:100], "total": len(results)}


@api.get("/admin/atlas/volumes/{slug}")
async def admin_atlas_volume(slug: str, user: User = Depends(require_permission("atlas.view", 3))):
    volume = await db.atlas_volumes.find_one({"slug": slug}, {"_id": 0})
    if not volume:
        raise HTTPException(404, "Atlas volume not found")
    if volume.get("status") != "approved" and not await _atlas_can_manage(user):
        raise HTTPException(403, "Atlas volume is not approved for read-only access")
    return await _atlas_volume_payload(volume)


@api.post("/admin/atlas/volumes")
async def admin_atlas_create_volume(payload: dict, request: Request, user: User = Depends(require_permission("atlas.create", 5))):
    title = str(payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "Title is required")
    now = _now_iso()
    number = int(payload.get("number") or await db.atlas_volumes.count_documents({}))
    doc = {
        "id": str(uuid.uuid4()),
        "number": number,
        "title": title,
        "slug": payload.get("slug") or f"{number:02d}-{_slugify(title)}",
        "description": payload.get("description") or "",
        "owner_user_id": payload.get("owner_user_id") or user.user_id,
        "owner_role": payload.get("owner_role") or "Super Admin",
        "status": "draft",
        "current_version": "0.1.0",
        "visibility": payload.get("visibility") or "internal",
        "estimated_pages": int(payload.get("estimated_pages") or 0),
        "priority": payload.get("priority") or "medium",
        "tags": payload.get("tags") or [],
        "linked_volume_ids": payload.get("linked_volume_ids") or [],
        "purpose": payload.get("purpose") or payload.get("description") or "",
        "suggested_sections": payload.get("suggested_sections") or [],
        "created_at": now,
        "updated_at": now,
        "approved_at": None,
        "deprecated_at": None,
    }
    await db.atlas_volumes.insert_one(doc)
    await _record_atlas_audit("volume.created", "volume", doc["id"], user.user_id, after=doc, request=request)
    return doc


@api.patch("/admin/atlas/volumes/{volume_id}")
async def admin_atlas_update_volume(volume_id: str, payload: dict, request: Request, user: User = Depends(require_permission("atlas.edit", 5))):
    before = await db.atlas_volumes.find_one({"id": volume_id}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Atlas volume not found")
    if before.get("status") in {"approved", "deprecated"} and not payload.get("createDraft"):
        raise HTTPException(400, "Approved or deprecated volumes require a new draft version before editing")
    allowed = {key: payload[key] for key in ("title", "description", "owner_user_id", "owner_role", "visibility", "estimated_pages", "priority", "tags", "linked_volume_ids", "purpose", "suggested_sections") if key in payload}
    if "title" in allowed:
        allowed["slug"] = payload.get("slug") or before.get("slug") or _slugify(allowed["title"])
    allowed["updated_at"] = _now_iso()
    await db.atlas_volumes.update_one({"id": volume_id}, {"$set": allowed})
    after = await db.atlas_volumes.find_one({"id": volume_id}, {"_id": 0})
    await _record_atlas_audit("volume.edited", "volume", volume_id, user.user_id, before=before, after=after, request=request)
    return after


@api.post("/admin/atlas/volumes/{volume_id}/workflow")
async def admin_atlas_volume_workflow(volume_id: str, payload: dict, request: Request, user: User = Depends(require_permission("atlas.review", 5))):
    action = payload.get("action")
    before = await db.atlas_volumes.find_one({"id": volume_id}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Atlas volume not found")
    now = _now_iso()
    updates = {"updated_at": now}
    if action == "send_review":
        updates["status"] = "review"
        await db.atlas_reviews.insert_one({"id": str(uuid.uuid4()), "volume_id": volume_id, "section_id": None, "reviewer_user_id": payload.get("reviewer_user_id") or user.user_id, "status": "pending", "comments": payload.get("comments") or "", "created_at": now, "updated_at": now})
    elif action == "approve":
        if not await _has_permission(user, "atlas.approve", 5):
            raise HTTPException(403, "Insufficient permissions")
        if payload.get("critical") and not payload.get("confirmCritical"):
            raise HTTPException(400, "Critical Atlas approvals require confirmation")
        updates["status"] = "approved"
        updates["approved_at"] = now
    elif action == "deprecate":
        if not await _has_permission(user, "atlas.approve", 5):
            raise HTTPException(403, "Insufficient permissions")
        updates["status"] = "deprecated"
        updates["deprecated_at"] = now
    else:
        raise HTTPException(400, "Unsupported workflow action")
    await db.atlas_volumes.update_one({"id": volume_id}, {"$set": updates})
    after = await db.atlas_volumes.find_one({"id": volume_id}, {"_id": 0})
    await _record_atlas_audit(action, "volume", volume_id, user.user_id, before=before, after=after, metadata={"comments": payload.get("comments")}, request=request)
    return after


@api.post("/admin/atlas/volumes/{volume_id}/versions")
async def admin_atlas_create_version(volume_id: str, payload: dict, request: Request, user: User = Depends(require_permission("atlas.edit", 5))):
    volume = await db.atlas_volumes.find_one({"id": volume_id}, {"_id": 0})
    if not volume:
        raise HTTPException(404, "Atlas volume not found")
    sections = await db.atlas_sections.find({"volume_id": volume_id}, {"_id": 0}).to_list(500)
    version_type = payload.get("version_type") or "minor"
    version = payload.get("version") or _next_semver(volume.get("current_version"), version_type)
    now = _now_iso()
    doc = {"id": str(uuid.uuid4()), "volume_id": volume_id, "version": version, "version_type": version_type, "change_summary": payload.get("change_summary") or "", "content_snapshot": {"volume": volume, "sections": sections}, "created_by_user_id": user.user_id, "created_at": now}
    await db.atlas_versions.insert_one(doc)
    await db.atlas_volumes.update_one({"id": volume_id}, {"$set": {"current_version": version, "status": "draft", "updated_at": now}})
    await _record_atlas_audit("version.created", "version", doc["id"], user.user_id, after=doc, request=request)
    return doc


@api.post("/admin/atlas/sections")
async def admin_atlas_save_section(payload: dict, request: Request, user: User = Depends(require_permission("atlas.edit", 5))):
    title = str(payload.get("title") or "").strip()
    volume_id = payload.get("volume_id")
    if not title or not volume_id:
        raise HTTPException(400, "Volume and title are required")
    now = _now_iso()
    section_id = payload.get("id") or str(uuid.uuid4())
    before = await db.atlas_sections.find_one({"id": section_id}, {"_id": 0})
    doc = {
        "id": section_id,
        "volume_id": volume_id,
        "parent_section_id": payload.get("parent_section_id"),
        "title": title,
        "slug": payload.get("slug") or _slugify(title),
        "order_index": int(payload.get("order_index") or payload.get("order") or 0),
        "summary": payload.get("summary") or "",
        "content_markdown": payload.get("content_markdown") or "",
        "status": payload.get("status") or "draft",
        "tags": payload.get("tags") or [],
        "linked_decision_ids": payload.get("linked_decision_ids") or [],
        "linked_glossary_terms": payload.get("linked_glossary_terms") or [],
        "created_at": before.get("created_at") if before else now,
        "updated_at": now,
    }
    if before:
        await db.atlas_sections.update_one({"id": section_id}, {"$set": doc})
    else:
        await db.atlas_sections.insert_one(doc)
    await db.atlas_volumes.update_one({"id": volume_id}, {"$set": {"updated_at": now}})
    await _record_atlas_audit("section.edited" if before else "section.created", "section", section_id, user.user_id, before=before, after=doc, request=request)
    return doc


@api.post("/admin/atlas/decisions")
async def admin_atlas_save_decision(payload: dict, request: Request, user: User = Depends(require_permission("atlas.decision_log.manage", 5))):
    title = str(payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "Decision title is required")
    now = _now_iso()
    decision_id = payload.get("id") or str(uuid.uuid4())
    before = await db.atlas_decision_logs.find_one({"id": decision_id}, {"_id": 0})
    if payload.get("status") == "approved" and payload.get("critical") and not payload.get("confirmCritical"):
        raise HTTPException(400, "Critical decisions require confirmation before approval")
    doc = {
        "id": decision_id,
        "title": title,
        "decision_type": payload.get("decision_type") or "product",
        "context": payload.get("context") or "",
        "decision": payload.get("decision") or "",
        "alternatives_considered": payload.get("alternatives_considered") or "",
        "consequences": payload.get("consequences") or "",
        "owner_user_id": payload.get("owner_user_id") or user.user_id,
        "status": payload.get("status") or "proposed",
        "linked_volume_ids": payload.get("linked_volume_ids") or [],
        "linked_section_ids": payload.get("linked_section_ids") or [],
        "created_at": before.get("created_at") if before else now,
        "updated_at": now,
    }
    if before:
        await db.atlas_decision_logs.update_one({"id": decision_id}, {"$set": doc})
    else:
        await db.atlas_decision_logs.insert_one(doc)
    await _record_atlas_audit("decision.edited" if before else "decision.created", "decision", decision_id, user.user_id, before=before, after=doc, request=request)
    return doc


@api.post("/admin/atlas/glossary")
async def admin_atlas_save_glossary(payload: dict, request: Request, user: User = Depends(require_permission("atlas.glossary.manage", 5))):
    term = str(payload.get("term") or "").strip()
    if not term:
        raise HTTPException(400, "Term is required")
    now = _now_iso()
    term_id = payload.get("id") or f"atlas-term-{_slugify(term)}"
    before = await db.atlas_glossary_terms.find_one({"id": term_id}, {"_id": 0})
    doc = {"id": term_id, "term": term, "definition": payload.get("definition") or "", "related_terms": payload.get("related_terms") or [], "linked_volume_ids": payload.get("linked_volume_ids") or [], "created_at": before.get("created_at") if before else now, "updated_at": now}
    if before:
        await db.atlas_glossary_terms.update_one({"id": term_id}, {"$set": doc})
    else:
        await db.atlas_glossary_terms.insert_one(doc)
    await _record_atlas_audit("glossary.edited" if before else "glossary.created", "glossary", term_id, user.user_id, before=before, after=doc, request=request)
    return doc


@api.delete("/admin/atlas/glossary/{term_id}")
async def admin_atlas_delete_glossary(term_id: str, request: Request, user: User = Depends(require_permission("atlas.glossary.manage", 5))):
    before = await db.atlas_glossary_terms.find_one({"id": term_id}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Glossary term not found")
    await db.atlas_glossary_terms.delete_one({"id": term_id})
    await _record_atlas_audit("glossary.deleted", "glossary", term_id, user.user_id, before=before, request=request)
    return {"ok": True}


@api.patch("/admin/atlas/settings")
async def admin_atlas_settings(payload: dict, request: Request, user: User = Depends(require_permission("atlas.settings.manage", 5))):
    settings = await _get_settings()
    before = settings.get("atlas_settings") or {}
    after = _deep_merge_settings(before, payload)
    await db.site_settings.update_one({"id": "main"}, {"$set": {"atlas_settings": after}}, upsert=True)
    await _record_atlas_audit("settings.update", "settings", "atlas", user.user_id, before=before, after=after, request=request)
    return after


@api.get("/admin/atlas/export")
async def admin_atlas_export(format: str = "json", volume_id: Optional[str] = None, user: User = Depends(require_permission("atlas.export", 4))):
    if volume_id:
        volume = await db.atlas_volumes.find_one({"id": volume_id}, {"_id": 0})
        if not volume:
            raise HTTPException(404, "Atlas volume not found")
        payload = await _atlas_volume_payload(volume)
    else:
        payload = await admin_atlas_index(user)
    if format == "markdown":
        volumes = [payload] if volume_id else payload["volumes"]
        lines = ["# Mosaico Atlas Export", ""]
        for volume in volumes:
            lines.extend([f"## Volume {int(volume.get('number', 0)):02d} - {volume.get('title')}", "", volume.get("description") or "", ""])
            for section in volume.get("sections", []):
                lines.extend([f"### {section.get('title')}", "", section.get("content_markdown") or section.get("summary") or "", ""])
        return Response("\n".join(lines), media_type="text/markdown")
    return payload


@api.get("/admin/system-health")
async def admin_system_health(_: User = Depends(require_permission("settings.platform.view", 4))):
    settings = await _get_settings()
    platform_config = settings.get("platform_config") or DEFAULT_SETTINGS["platform_config"]
    return {
        "app": APP_NAME,
        "database": {"ok": True, "users": await db.users.count_documents({}), "roles": await db.roles.count_documents({})},
        "storage": {"configured": _has_real_supabase_storage_config(), "bucket": SUPABASE_STORAGE_BUCKET},
        "auth": {"dev_auth_enabled": _dev_auth_enabled(), "local_session_minutes": LOCAL_AUTH_SESSION_MINUTES},
        "features": platform_config.get("feature_flags", {}),
        "maintenance_mode": (platform_config.get("general") or {}).get("maintenance_mode", False),
        "version": {"commit": os.environ.get("RENDER_GIT_COMMIT") or os.environ.get("GIT_COMMIT") or "unknown"},
    }


@api.get("/admin/users/{user_id}/login-history")
async def admin_user_login_history(user_id: str, _: User = Depends(require_admin)):
    docs = await db.login_history.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return docs


@api.get("/admin/users/{user_id}/audit-events")
async def admin_user_audit_events(user_id: str, _: User = Depends(require_admin)):
    docs = await db.audit_events.find({"target_user_id": user_id}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return docs


@api.get("/technical/docs")
async def technical_docs(_: User = Depends(require_technical)):
    return [_technical_doc_payload(doc_id) for doc_id in TECHNICAL_DOCS]


@api.get("/technical/docs/{doc_id}")
async def technical_doc(doc_id: str, _: User = Depends(require_technical)):
    return _technical_doc_payload(doc_id, include_content=True)


# ---- Student profiles
@api.get("/admin/student-profiles")
async def admin_student_profiles(_: User = Depends(require_permission("students:manage"))):
    docs = await db.student_profiles.find({}, {"_id": 0}).to_list(500)
    for d in docs:
        d["user"] = await db.users.find_one({"user_id": d["user_id"]}, {"_id": 0})
    return docs


@api.post("/admin/student-profiles")
async def admin_create_student_profile(payload: dict, user: User = Depends(require_permission("students:manage"))):
    if not payload.get("user_id"):
        raise HTTPException(400, "user_id required")
    now = _now_iso()
    doc = {
        "id": payload.get("id") or f"sp_{uuid.uuid4().hex[:10]}",
        "user_id": payload["user_id"],
        "phone": payload.get("phone", ""),
        "enrolled_products": payload.get("enrolled_products", []),
        "notes": payload.get("notes", ""),
        "status": payload.get("status", "activo"),
        "created_at": now,
        "updated_at": now,
    }
    await db.student_profiles.insert_one(doc)
    return doc


@api.patch("/admin/student-profiles/{profile_id}")
async def admin_update_student_profile(profile_id: str, payload: dict, _: User = Depends(require_permission("students:manage"))):
    allowed = {k: v for k, v in payload.items() if k in ("phone", "enrolled_products", "notes", "status")}
    allowed["updated_at"] = _now_iso()
    await db.student_profiles.update_one({"id": profile_id}, {"$set": allowed})
    return await db.student_profiles.find_one({"id": profile_id}, {"_id": 0})


# ---- CMS Pages
_PAGE_FIELDS = {"title", "slug", "language", "status", "meta_title", "meta_description", "content_blocks", "hero_image", "published_date"}


@api.get("/admin/pages")
async def admin_list_pages(language: Optional[str] = None, status: Optional[str] = None, _: User = Depends(require_permission("cms:manage"))):
    q = {}
    if language:
        q["language"] = language
    if status:
        q["status"] = status
    docs = await db.pages.find(q, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: d.get("updated_at", ""), reverse=True)
    return docs


@api.post("/admin/pages")
async def admin_create_page(payload: dict, user: User = Depends(require_permission("cms:manage"))):
    for k in ("title", "slug"):
        if not payload.get(k):
            raise HTTPException(400, f"{k} required")
    now = _now_iso()
    status = payload.get("status", "draft")
    doc = {k: payload.get(k) for k in _PAGE_FIELDS if k in payload}
    doc.update({
        "id": payload.get("id") or f"page_{uuid.uuid4().hex[:10]}",
        "language": payload.get("language", "es"),
        "status": status,
        "meta_title": payload.get("meta_title", ""),
        "meta_description": payload.get("meta_description", ""),
        "content_blocks": payload.get("content_blocks", []),
        "hero_image": payload.get("hero_image", ""),
        "created_by": user.user_id,
        "updated_by": user.user_id,
        "published_date": payload.get("published_date") or (now if status == "published" else None),
        "created_at": now,
        "updated_at": now,
    })
    await db.pages.insert_one(doc)
    return doc


@api.patch("/admin/pages/{page_id}")
async def admin_update_page(page_id: str, payload: dict, user: User = Depends(require_permission("cms:manage"))):
    allowed = {k: v for k, v in payload.items() if k in _PAGE_FIELDS}
    if allowed.get("status") == "published" and not allowed.get("published_date"):
        allowed["published_date"] = _now_iso()
    allowed["updated_by"] = user.user_id
    allowed["updated_at"] = _now_iso()
    await db.pages.update_one({"id": page_id}, {"$set": allowed})
    return await db.pages.find_one({"id": page_id}, {"_id": 0})


@api.post("/admin/pages/{page_id}/duplicate")
async def admin_duplicate_page(page_id: str, user: User = Depends(require_permission("cms:manage"))):
    page = await db.pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(404, "Page not found")
    now = _now_iso()
    page["id"] = f"page_{uuid.uuid4().hex[:10]}"
    page["title"] = f"{page['title']} copia"
    page["slug"] = f"{page['slug']}-copia-{uuid.uuid4().hex[:4]}"
    page["status"] = "draft"
    page["created_by"] = user.user_id
    page["updated_by"] = user.user_id
    page["published_date"] = None
    page["created_at"] = now
    page["updated_at"] = now
    await db.pages.insert_one(page)
    return page


@api.delete("/admin/pages/{page_id}")
async def admin_archive_page(page_id: str, user: User = Depends(require_permission("cms:manage"))):
    await db.pages.update_one({"id": page_id}, {"$set": {"status": "archived", "updated_by": user.user_id, "updated_at": _now_iso()}})
    return {"ok": True}


# ---- Media library
@api.get("/admin/media")
async def admin_list_media(_: User = Depends(require_permission("media:manage"))):
    docs = await db.media_assets.find({}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return docs


@api.post("/admin/media")
async def admin_create_media(payload: dict, user: User = Depends(require_permission("media:manage"))):
    if not payload.get("url"):
        raise HTTPException(400, "url required")
    now = _now_iso()
    doc = {
        "id": payload.get("id") or f"media_{uuid.uuid4().hex[:10]}",
        "file_name": payload.get("file_name") or payload["url"].split("/")[-1],
        "url": payload["url"],
        "type": payload.get("type", "image"),
        "alt_text": payload.get("alt_text", ""),
        "uploaded_by": user.user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.media_assets.insert_one(doc)
    return doc


@api.patch("/admin/media/{media_id}")
async def admin_update_media(media_id: str, payload: dict, _: User = Depends(require_permission("media:manage"))):
    allowed = {k: v for k, v in payload.items() if k in ("file_name", "url", "type", "alt_text")}
    allowed["updated_at"] = _now_iso()
    await db.media_assets.update_one({"id": media_id}, {"$set": allowed})
    return await db.media_assets.find_one({"id": media_id}, {"_id": 0})


@api.delete("/admin/media/{media_id}")
async def admin_delete_media(media_id: str, _: User = Depends(require_permission("media:manage"))):
    await db.media_assets.delete_one({"id": media_id})
    return {"ok": True}


# ---- Site Settings (CMS)
DEFAULT_SETTINGS = {
    "id": "main",
    "brand_name": "MOSAICO",
    "tagline_en": "Learn Spanish through real conversations.",
    "tagline_es": "Aprende español con conversaciones reales.",
    "logo_url": "",
    "favicon_url": "",
    "hero_image_url": "",
    "contact_email": "",
    "social_instagram": "",
    "social_twitter": "",
    "stripe": {
        "enabled": True,
        "test_mode": True,
        "publishable_key": "",
        "secret_key": "",
    },
    "google_calendar": {
        "enabled": False,
        "client_id": "",
        "client_secret": "",
        "refresh_token": "",
        "calendar_id": "primary",
        "auto_create_meet": True,
    },
    "platform_config": {
        "general": {
            "platform_name": "MOSAICO",
            "environment_badge": "Production",
            "support_email": "",
            "support_phone": "",
            "maintenance_mode": False,
        },
        "feature_flags": {
            "student_roadmap": True,
            "teacher_calendar": True,
            "credits_wallet": False,
            "ai_tutor": False,
            "community": False,
        },
        "booking_rules": {
            "min_notice_hours": 12,
            "max_days_ahead": 45,
            "allow_reschedule": True,
        },
        "credit_rules": {
            "default_class_cost": 2,
            "allow_negative_balance": False,
            "grant_requires_reason": True,
        },
        "cancellation_policy": {
            "free_cancel_hours": 12,
            "late_cancel_credit_penalty": 1,
        },
        "teacher_availability_rules": {
            "allowed_durations": [30, 45, 60],
            "default_cooldown_minutes": 0,
            "max_daily_classes": 8,
        },
        "student_scheduling_rules": {
            "max_active_bookings": 6,
            "require_active_credits": True,
        },
        "notification_settings": {
            "email_enabled": True,
            "booking_reminders": True,
            "credit_alerts": True,
        },
        "role_defaults": {
            "new_user_role": "alumno",
            "teacher_default_role": "profesor",
            "guardian_default_role": "tutor_padre",
        },
    },
    "content": {
        "hero": {
            "tag_en": "", "tag_es": "",
            "subtitle_en": "", "subtitle_es": "",
            "bubble_en": "", "bubble_es": "",
            "cta_primary_en": "", "cta_primary_es": "",
            "cta_secondary_en": "", "cta_secondary_es": "",
        },
        "audiences": [],
        "testimonials": [],
        "faq": [],
        "about": {
            "eyebrow_en": "", "eyebrow_es": "",
            "title_en": "", "title_es": "",
            "body_en": "", "body_es": "",
            "stats": [],
        },
        "footer": {"chips_en": "", "chips_es": ""},
    },
}
PUBLIC_SETTINGS_FIELDS = {"brand_name", "tagline_en", "tagline_es", "logo_url",
                          "favicon_url", "hero_image_url", "contact_email",
                          "social_instagram", "social_twitter", "content"}


async def _get_settings() -> dict:
    doc = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    if not doc:
        await db.site_settings.insert_one(dict(DEFAULT_SETTINGS))
        return dict(DEFAULT_SETTINGS)
    # Ensure all expected keys exist (forward compat)
    for k, v in DEFAULT_SETTINGS.items():
        if k not in doc:
            doc[k] = v
    return doc


def _deep_merge_settings(base: dict, patch: dict) -> dict:
    merged = dict(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge_settings(merged[key], value)
        else:
            merged[key] = value
    return merged


def _validate_platform_config(config: dict) -> None:
    general = config.get("general") or {}
    if not str(general.get("platform_name") or "").strip():
        raise HTTPException(400, "platform name is required")
    booking = config.get("booking_rules") or {}
    min_notice = int(booking.get("min_notice_hours", 0))
    max_days = int(booking.get("max_days_ahead", 0))
    if min_notice < 0 or max_days < 1 or max_days > 365:
        raise HTTPException(400, "booking rule values are out of range")
    credit = config.get("credit_rules") or {}
    if int(credit.get("default_class_cost", 1)) < 0:
        raise HTTPException(400, "default class cost cannot be negative")
    availability = config.get("teacher_availability_rules") or {}
    durations = availability.get("allowed_durations") or []
    if not durations or any(int(item) not in (30, 45, 60) for item in durations):
        raise HTTPException(400, "allowed durations must contain 30, 45, or 60 minutes")
    if int(availability.get("default_cooldown_minutes", 0)) < 0:
        raise HTTPException(400, "cooldown cannot be negative")
    role_defaults = config.get("role_defaults") or {}
    for key in ("new_user_role", "teacher_default_role", "guardian_default_role"):
        if role_defaults.get(key) and _normalize_role(role_defaults[key]) not in ROLE_LABELS:
            raise HTTPException(400, f"invalid default role: {role_defaults[key]}")


async def _get_stripe_key() -> str:
    s = await _get_settings()
    sk = (s.get("stripe") or {}).get("secret_key") or ""
    return sk.strip() or STRIPE_API_KEY


# ---- Google Calendar (real)
async def _get_gcal_access_token(s: dict) -> Optional[str]:
    cfg = s.get("google_calendar") or {}
    if not (cfg.get("enabled") and cfg.get("client_id") and cfg.get("client_secret") and cfg.get("refresh_token")):
        return None
    async with httpx.AsyncClient(timeout=20.0) as hc:
        r = await hc.post("https://oauth2.googleapis.com/token", data={
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "refresh_token": cfg["refresh_token"],
            "grant_type": "refresh_token",
        })
    if r.status_code != 200:
        logger.warning(f"gcal token refresh failed: {r.status_code} {r.text[:200]}")
        return None
    return r.json().get("access_token")


async def _create_gcal_event(booking: dict, product: dict) -> dict:
    """Creates a Google Calendar event with Meet link and sends invite email to attendee.
    Returns {'meet_link': str|None, 'event_link': str|None} or {} on failure."""
    s = await _get_settings()
    cfg = s.get("google_calendar") or {}
    token = await _get_gcal_access_token(s)
    if not token:
        return {}
    cal_id = cfg.get("calendar_id") or "primary"
    auto_meet = bool(cfg.get("auto_create_meet", True))
    try:
        tz = ZoneInfo(booking.get("timezone") or "UTC")
    except Exception:
        tz = timezone.utc
    try:
        start_dt = datetime.fromisoformat(f"{booking['scheduled_date']}T{booking['scheduled_time']}:00").replace(tzinfo=tz)
    except Exception as e:
        logger.warning(f"gcal date parse fail: {e}")
        return {}
    end_dt = start_dt + timedelta(minutes=product.get("duration_min") or 60)

    body = {
        "summary": f"MOSAICO · {product['name_en']} · {booking['user_name']}",
        "description": (
            f"Spanish class with {booking.get('teacher_name') or 'your teacher'}.\n"
            f"Booked via MOSAICO."
        ),
        "start": {"dateTime": start_dt.isoformat(), "timeZone": str(tz)},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": str(tz)},
        "attendees": [{"email": booking["user_email"]}],
        "reminders": {"useDefault": True},
    }
    params = {"sendUpdates": "all"}
    if auto_meet:
        body["conferenceData"] = {
            "createRequest": {
                "requestId": booking["id"],
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        }
        params["conferenceDataVersion"] = 1

    async with httpx.AsyncClient(timeout=30.0) as hc:
        r = await hc.post(
            f"https://www.googleapis.com/calendar/v3/calendars/{cal_id}/events",
            headers={"Authorization": f"Bearer {token}"},
            params=params, json=body,
        )
    if r.status_code not in (200, 201):
        logger.warning(f"gcal create failed: {r.status_code} {r.text[:300]}")
        return {}
    data = r.json()
    meet = None
    for ep in (data.get("conferenceData") or {}).get("entryPoints", []):
        if ep.get("entryPointType") == "video":
            meet = ep.get("uri")
            break
    return {"meet_link": meet or data.get("hangoutLink"), "event_link": data.get("htmlLink")}


@api.get("/settings/public")
async def get_public_settings():
    s = await _get_settings()
    public_settings = {k: s.get(k, "") for k in PUBLIC_SETTINGS_FIELDS}
    platform_config = s.get("platform_config") or DEFAULT_SETTINGS["platform_config"]
    public_settings["platform_config"] = {
        "feature_flags": platform_config.get("feature_flags") or DEFAULT_SETTINGS["platform_config"]["feature_flags"],
    }
    return public_settings


@api.get("/admin/configuration/settings")
async def admin_configuration_settings(_: User = Depends(require_permission("settings.platform.view", 4))):
    settings = await _get_settings()
    return {
        "platform_config": settings.get("platform_config") or DEFAULT_SETTINGS["platform_config"],
        "public_branding": {key: settings.get(key, "") for key in ("brand_name", "tagline_en", "tagline_es", "logo_url", "favicon_url", "hero_image_url", "contact_email", "social_instagram", "social_twitter")},
        "safe_defaults": DEFAULT_SETTINGS["platform_config"],
    }


@api.patch("/admin/configuration/settings")
async def admin_update_configuration_settings(payload: dict, request: Request, user: User = Depends(require_permission("settings.platform.edit", 5))):
    existing = await _get_settings()
    before = {
        "platform_config": existing.get("platform_config") or DEFAULT_SETTINGS["platform_config"],
        "public_branding": {key: existing.get(key, "") for key in ("brand_name", "tagline_en", "tagline_es", "logo_url", "favicon_url", "hero_image_url", "contact_email", "social_instagram", "social_twitter")},
    }
    next_config = _deep_merge_settings(before["platform_config"], payload.get("platform_config") or {})
    _validate_platform_config(next_config)
    branding_payload = payload.get("public_branding") or {}
    allowed_branding = {key: branding_payload[key] for key in ("brand_name", "tagline_en", "tagline_es", "logo_url", "favicon_url", "hero_image_url", "contact_email", "social_instagram", "social_twitter") if key in branding_payload}
    update_doc = {**allowed_branding, "platform_config": next_config}
    await db.site_settings.update_one({"id": "main"}, {"$set": update_doc}, upsert=True)
    after_settings = await _get_settings()
    after = {
        "platform_config": after_settings.get("platform_config") or DEFAULT_SETTINGS["platform_config"],
        "public_branding": {key: after_settings.get(key, "") for key in before["public_branding"]},
    }
    await _record_audit_event(
        "settings.platform.update",
        "platform_settings",
        entity_id="main",
        actor_user_id=user.user_id,
        actor_name=user.name,
        metadata={"changed_keys": sorted(update_doc.keys())},
        before=before,
        after=after,
        risk_level="critical" if next_config.get("general", {}).get("maintenance_mode") else "high",
        request=request,
    )
    await _record_activity_log(
        "platform.settings.updated",
        "settings.platform.update",
        "platform_settings",
        "Platform configuration updated.",
        actor_user_id=user.user_id,
        actor_name=user.name,
        target_id="main",
        metadata={"changed_keys": sorted(update_doc.keys())},
    )
    await _record_analytics_event("settings_updated", user=user, module="settings", entity_type="platform_settings", entity_id="main", metadata={"changed_keys": sorted(update_doc.keys())})
    return after


@api.get("/admin/settings")
async def admin_get_settings(_: User = Depends(require_admin)):
    return await _get_settings()


@api.patch("/admin/settings")
async def admin_update_settings(payload: dict, _: User = Depends(require_admin)):
    payload.pop("_id", None)
    payload.pop("id", None)
    # Deep-merge known nested sub-objects so partial PATCH preserves siblings
    existing = await _get_settings()
    if "stripe" in payload and isinstance(payload["stripe"], dict):
        payload["stripe"] = {**existing.get("stripe", {}), **payload["stripe"]}
    if "google_calendar" in payload and isinstance(payload["google_calendar"], dict):
        payload["google_calendar"] = {**existing.get("google_calendar", {}), **payload["google_calendar"]}
    if "content" in payload and isinstance(payload["content"], dict):
        merged_content = dict(existing.get("content", {}))
        for k, v in payload["content"].items():
            if isinstance(v, dict) and isinstance(merged_content.get(k), dict):
                merged_content[k] = {**merged_content[k], **v}
            else:
                merged_content[k] = v
        payload["content"] = merged_content
    await db.site_settings.update_one({"id": "main"}, {"$set": payload}, upsert=True)
    return await _get_settings()


@api.post("/admin/settings/test-gcal")
async def admin_test_gcal(user: User = Depends(require_admin)):
    """Sends a real test Google Calendar invite (+ Meet link) to the admin's email."""
    s = await _get_settings()
    token = await _get_gcal_access_token(s)
    if not token:
        raise HTTPException(400, "Calendar not configured (enable + client_id + client_secret + refresh_token)")
    now = datetime.now(timezone.utc) + timedelta(minutes=5)
    fake_booking = {
        "id": f"test-{uuid.uuid4().hex[:8]}",
        "user_email": user.email,
        "user_name": user.name,
        "teacher_name": "Test",
        "scheduled_date": now.date().isoformat(),
        "scheduled_time": now.strftime("%H:%M"),
        "timezone": "UTC",
    }
    fake_product = {"name_en": "Calendar Connection Test", "duration_min": 15}
    out = await _create_gcal_event(fake_booking, fake_product)
    if not out:
        raise HTTPException(502, "Calendar API call failed — check backend logs")
    return {"ok": True, **out, "message": f"Test invite sent to {user.email}"}




# ---- Mount
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    await close_pool()
