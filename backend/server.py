"""Lily Spanish — Backend API."""
import os
import uuid
import logging
import mimetypes
import json
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import httpx
import jwt
import stripe
from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends, UploadFile, File
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import get_database, close_pool, Database

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
    "cms": "editor_cms",
}
ADMIN_ROLES = {"administrador_sitio", "administrador_profesor"}
ROLE_LABELS = {
    "administrador_sitio": "Super Admin",
    "administrador_profesor": "Admin",
    "coordinador": "Coordinator",
    "profesor": "Teacher",
    "editor_cms": "Editor CMS",
    "alumno": "Student",
    "tutor_padre": "Tutor / Parent",
    "viewer": "Viewer",
}
ROLE_LEVELS = {
    "alumno": 10,
    "viewer": 15,
    "tutor_padre": 20,
    "profesor": 30,
    "coordinador": 60,
    "editor_cms": 40,
    "administrador_profesor": 70,
    "administrador_sitio": 100,
}
SYSTEM_ROLE_NAMES = {"administrador_sitio", "administrador_profesor", "coordinador", "profesor", "alumno", "tutor_padre", "viewer"}
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
    _dot_permission("settings.platform.view", "View platform settings.", 4),
    _dot_permission("settings.platform.edit", "Edit platform settings.", 5),
    _dot_permission("audit.logs.view", "View audit logs.", 5),
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
] + DOT_PERMISSION_CATALOG
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
        "audit.logs.view": 5,
    },
    "coordinador": {
        "dashboard.general.view": 3, "users.profile.view": 3, "calendar.teacher.view": 3,
        "calendar.teacher.edit": 3, "calendar.teacher.block": 3, "calendar.teacher.invite_students": 3,
        "classes.sessions.view": 3, "classes.sessions.create": 3, "classes.sessions.edit": 3,
        "classes.sessions.cancel": 3, "students.profile.view": 3, "students.profile.edit": 3,
        "students.progress.view": 3, "students.credits.view": 3, "teachers.profile.view": 3,
        "teachers.profile.edit": 3, "teachers.availability.view": 3, "teachers.availability.manage": 3,
        "credits.wallet.view": 3, "reports.analytics.view": 3,
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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    roles = {_normalize_role(doc.get("role_name")) for doc in docs if doc.get("active", True)}
    if not roles:
        roles = {_normalize_role(user.role)}
    return sorted(roles, key=lambda role: ROLE_LEVELS.get(role, 0), reverse=True)


async def _effective_permission_levels(user: User) -> Dict[str, int]:
    effective: Dict[str, int] = {}
    for role in await _effective_role_names(user):
        fallback = ROLE_PERMISSION_LEVELS.get(role, {})
        for permission, level in fallback.items():
            effective[permission] = max(effective.get(permission, 0), int(level))
        docs = await db.role_permissions.find({"role_name": role}, {"_id": 0}).to_list(200)
        for doc in docs:
            permission = doc.get("permission")
            level = int(doc.get("level") or 0)
            if permission and level > 0:
                effective[permission] = max(effective.get(permission, 0), level)
    return effective


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
    target_user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    await db.audit_events.insert_one({
        "id": str(uuid.uuid4()),
        "actor_user_id": actor_user_id,
        "target_user_id": target_user_id,
        "event_type": event_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "ip_address": request.client.host if request and request.client else None,
        "user_agent": request.headers.get("user-agent") if request else None,
        "created_at": _now_iso(),
    })


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
    if not user_doc or user_doc.get("active") is False:
        raise HTTPException(status_code=403, detail="User is inactive")
    return User(**user_doc)


async def _sync_user_role(user_id: str, role: str, assigned_by: Optional[str] = None) -> None:
    role = _normalize_role(role)
    now = _now_iso()
    existing = await db.user_roles.find_one({"user_id": user_id, "role_name": role}, {"_id": 0})
    if existing:
        await db.user_roles.update_one({"user_id": user_id, "role_name": role}, {"$set": {"active": True, "assigned_by": assigned_by, "updated_at": now}})
    else:
        await db.user_roles.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "role_name": role, "active": True, "assigned_by": assigned_by, "created_at": now, "updated_at": now})


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
    if user_doc.get("active") is False:
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
        return await _get_user_from_local_session(token)

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
        return User(**doc)

    payload = await _get_supabase_user_payload(token)
    return await _get_or_create_user_from_supabase(payload, request)

async def require_admin(user: User = Depends(get_current_user)) -> User:
    roles = await _effective_role_names(user)
    if not any(role in ADMIN_ROLES for role in roles):
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def require_permission(permission: str, min_level: int = 1):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if not await _has_permission(user, permission, min_level):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


async def require_technical(user: User = Depends(get_current_user)) -> User:
    roles = await _effective_role_names(user)
    if "administrador_sitio" in roles or await _has_permission(user, "*", 100):
        return user
    raise HTTPException(status_code=403, detail="Technical role required")


TECHNICAL_DOCS = {
    "platform-roadmap": {"title": "Platform Roadmap", "path": "docs/PLATFORM_ROADMAP.md", "section": "roadmap"},
    "phase-1-execution-plan": {"title": "Phase 1 Execution Plan", "path": "docs/PHASE_1_EXECUTION_PLAN.md", "section": "roadmap"},
    "product-documentation": {"title": "Product Documentation", "path": "docs/PRODUCT_DOCUMENTATION.md", "section": "roadmap"},
    "teacher-calendar-workspace": {"title": "Teacher Calendar Workspace", "path": "docs/TEACHER_CALENDAR_WORKSPACE.md", "section": "roadmap"},
    "rbac-admin-module": {"title": "RBAC Admin Module", "path": "docs/RBAC_ADMIN_MODULE.md", "section": "roadmap"},
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
    db = await get_database()


@app.on_event("startup")
async def init_storage():
    await _ensure_storage_bucket()


@app.on_event("startup")
async def seed_data():
    now = _now_iso()
    for name, label in ROLE_LABELS.items():
        role_doc = {
            "id": name, "name": name, "label": label, "description": label,
            "level": ROLE_LEVELS.get(name, 0), "type": "system", "status": "active", "active": True, "updated_at": now,
        }
        if await db.roles.find_one({"name": name}, {"_id": 0}):
            await db.roles.update_one({"name": name}, {"$set": role_doc})
        else:
            await db.roles.insert_one({**role_doc, "created_at": now})
    for item in PERMISSION_CATALOG:
        name_parts = item["name"].split(".")
        doc = {
            **item,
            "id": item["name"],
            "description": item.get("description") or item["label"],
            "module": item.get("module") or item.get("catalog") or name_parts[0],
            "section": item.get("section") or item.get("feature") or (name_parts[1] if len(name_parts) > 1 else "general"),
            "risk_level": item.get("risk_level") or _permission_risk(item["name"]),
            "active": True,
            "updated_at": now,
        }
        if await db.permissions.find_one({"name": item["name"]}, {"_id": 0}):
            await db.permissions.update_one({"name": item["name"]}, {"$set": doc})
        else:
            await db.permissions.insert_one({**doc, "created_at": now})
    for role, permissions in ROLE_PERMISSION_LEVELS.items():
        for permission, level in permissions.items():
            existing = await db.role_permissions.find_one({"role_name": role, "permission": permission}, {"_id": 0})
            doc = {"role_name": role, "permission": permission, "level": level, "scope": "global", "updated_at": now}
            if existing:
                await db.role_permissions.update_one({"role_name": role, "permission": permission}, {"$set": doc})
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

# ---------- Routes ----------
@api.get("/")
async def root():
    return {"app": "Lily Spanish", "ok": True}


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
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user_doc.get("active") is False:
        raise HTTPException(status_code=403, detail="User is inactive")
    if not _verify_password(payload.password, user_doc["password_hash"]):
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
    return slot

@api.delete("/admin/availability/{slot_id}")
async def delete_slot(slot_id: str, _: User = Depends(require_permission("bookings:manage"))):
    await db.availability.delete_one({"id": slot_id})
    return {"ok": True}

# ---- Payments
@api.post("/payments/checkout")
async def create_checkout(request: Request, payload: dict, user: User = Depends(get_current_user)):
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
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.id}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Transaction not found")

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

# ---- Bookings
@api.get("/bookings/me")
async def my_bookings(user: User = Depends(get_current_user)):
    docs = await db.bookings.find({"user_id": user.user_id}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda b: (b.get("scheduled_date", ""), b.get("scheduled_time", "")), reverse=True)
    return docs

@api.get("/admin/bookings")
async def all_bookings(_: User = Depends(require_permission("bookings:manage"))):
    docs = await db.bookings.find({}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda b: (b.get("scheduled_date", ""), b.get("scheduled_time", "")), reverse=True)
    return docs

@api.patch("/admin/bookings/{booking_id}")
async def update_booking(booking_id: str, payload: dict, _: User = Depends(require_permission("bookings:manage"))):
    allowed = {k: v for k, v in payload.items() if k in ("status", "meeting_link", "notes")}
    await db.bookings.update_one({"id": booking_id}, {"$set": allowed})
    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})

@api.get("/admin/students")
async def all_students(_: User = Depends(require_permission("students:manage"))):
    docs = await db.users.find({}, {"_id": 0}).to_list(500)
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
async def admin_list_users(_: User = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0}).to_list(500)
    for d in docs:
        d["booking_count"] = await db.bookings.count_documents({"user_id": d["user_id"]})
        d["role"] = _normalize_role(d.get("role"))
        d["roles"] = await _active_user_roles(d["user_id"])
    docs.sort(key=lambda u: str(u.get("created_at", "")), reverse=True)
    return docs


@api.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, payload: dict, request: Request, current: User = Depends(require_admin)):
    before = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    allowed = {k: v for k, v in payload.items() if k in ("name", "role", "picture", "active")}
    if "role" in allowed:
        allowed["role"] = _normalize_role(allowed["role"])
    if "role" in allowed and allowed["role"] not in ROLE_LABELS:
        raise HTTPException(400, "invalid role")
    allowed["updated_at"] = _now_iso()
    await db.users.update_one({"user_id": user_id}, {"$set": allowed})
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
async def admin_delete_user(user_id: str, current: User = Depends(require_admin)):
    if user_id == current.user_id:
        raise HTTPException(400, "Cannot delete yourself")
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
async def admin_update_role_permissions(role_name: str, payload: dict, request: Request, user: User = Depends(require_permission("roles:manage"))):
    role_name = _normalize_role(role_name)
    if not await db.roles.find_one({"name": role_name}, {"_id": 0}):
        raise HTTPException(404, "role not found")
    requested = payload.get("permissions", [])
    if not isinstance(requested, list):
        raise HTTPException(400, "permissions must be a list")
    now = _now_iso()
    requested_names = set()
    for item in requested:
        permission = item.get("permission") if isinstance(item, dict) else str(item)
        level = int(item.get("level", 1)) if isinstance(item, dict) else 1
        level = max(1, min(level, 100))
        if not await db.permissions.find_one({"name": permission}, {"_id": 0}):
            raise HTTPException(400, f"invalid permission: {permission}")
        requested_names.add(permission)
        existing = await db.role_permissions.find_one({"role_name": role_name, "permission": permission}, {"_id": 0})
        doc = {"role_name": role_name, "permission": permission, "level": level, "scope": "global", "updated_at": now}
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
    return {"ok": True, "updated_by": user.user_id}


@api.patch("/admin/users/{user_id}/roles")
async def admin_update_user_roles(user_id: str, payload: dict, request: Request, user: User = Depends(require_permission("roles:manage"))):
    requested = payload.get("roles", [])
    if not isinstance(requested, list) or not requested:
        raise HTTPException(400, "roles must be a non-empty list")
    roles = [_normalize_role(role) for role in requested]
    invalid = []
    for role in roles:
        if not await db.roles.find_one({"name": role}, {"_id": 0}):
            invalid.append(role)
    if invalid:
        raise HTTPException(400, f"invalid roles: {', '.join(invalid)}")
    now = _now_iso()
    primary_role = sorted(set(roles), key=lambda role: ROLE_LEVELS.get(role, 0), reverse=True)[0]
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": primary_role, "updated_at": now}})
    for role in set(roles):
        await _sync_user_role(user_id, role, assigned_by=user.user_id)
    existing = await db.user_roles.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for assignment in existing:
        role = _normalize_role(assignment.get("role_name"))
        if role not in set(roles):
            await db.user_roles.update_one(
                {"user_id": user_id, "role_name": role},
                {"$set": {"active": False, "updated_at": now}},
            )
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    updated["roles"] = await _effective_role_names(User(**updated))
    await _record_audit_event(
        "admin.user.roles.update",
        "user",
        entity_id=user_id,
        actor_user_id=user.user_id,
        target_user_id=user_id,
        metadata={"roles": updated["roles"], "primary_role": updated.get("role")},
        request=request,
    )
    return updated


@api.get("/admin/rbac/roles")
async def admin_rbac_roles(_: User = Depends(require_permission("roles.management.view"))):
    roles = await db.roles.find({}, {"_id": 0}).to_list(200)
    payload = [await _role_payload(role) for role in roles]
    payload.sort(key=lambda item: (item.get("type") != "system", -int(item.get("level") or 0), item.get("label", "")))
    return payload


@api.get("/admin/rbac/roles/{role_name}")
async def admin_rbac_role_detail(role_name: str, _: User = Depends(require_permission("roles.management.view"))):
    role = await db.roles.find_one({"name": _normalize_role(role_name)}, {"_id": 0})
    if not role:
        raise HTTPException(404, "Role not found")
    return await _role_payload(role, include_users=True, include_audit=True)


@api.post("/admin/rbac/roles")
async def admin_rbac_create_role(payload: dict, request: Request, user: User = Depends(require_permission("roles.management.create"))):
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
        "label": payload.get("label") or payload.get("name") or name,
        "description": payload.get("description") or "",
        "level": int(payload.get("level") or 20),
        "type": "custom",
        "status": "active",
        "active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.roles.insert_one(doc)
    await _record_audit_event("rbac.role.create", "role", entity_id=name, actor_user_id=user.user_id, metadata={"after": doc}, request=request)
    return await _role_payload(doc)


@api.patch("/admin/rbac/roles/{role_name}")
async def admin_rbac_update_role(role_name: str, payload: dict, request: Request, user: User = Depends(require_permission("roles.management.edit"))):
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
async def admin_rbac_duplicate_role(role_name: str, payload: dict, request: Request, user: User = Depends(require_permission("roles.management.create"))):
    source_name = _normalize_role(role_name)
    source = await db.roles.find_one({"name": source_name}, {"_id": 0})
    if not source:
        raise HTTPException(404, "Role not found")
    new_name = (payload.get("name") or f"{source_name}_copy").strip().lower().replace(" ", "_")
    if await db.roles.find_one({"name": new_name}, {"_id": 0}):
        raise HTTPException(400, "Role already exists")
    now = _now_iso()
    new_role = {**source, "id": new_name, "name": new_name, "label": payload.get("label") or f"{source.get('label', source_name)} Copy", "type": "custom", "status": "active", "active": True, "created_at": now, "updated_at": now}
    await db.roles.insert_one(new_role)
    assignments = await db.role_permissions.find({"role_name": source_name}, {"_id": 0}).to_list(500)
    for assignment in assignments:
        if int(assignment.get("level") or 0) > 0:
            await db.role_permissions.insert_one({"id": str(uuid.uuid4()), "role_name": new_name, "permission": assignment["permission"], "level": int(assignment.get("level") or 1), "scope": assignment.get("scope") or "global", "created_at": now, "updated_at": now})
    await _record_audit_event("rbac.role.duplicate", "role", entity_id=new_name, actor_user_id=user.user_id, metadata={"source": source_name, "after": new_role}, request=request)
    return await _role_payload(new_role)


@api.patch("/admin/rbac/roles/{role_name}/status")
async def admin_rbac_role_status(role_name: str, payload: dict, request: Request, user: User = Depends(require_permission("roles.management.edit"))):
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
async def admin_rbac_delete_role(role_name: str, request: Request, user: User = Depends(require_permission("roles.management.delete"))):
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
async def admin_rbac_permissions(_: User = Depends(require_permission("roles.management.view"))):
    permissions = await db.permissions.find({"active": True}, {"_id": 0}).to_list(1000)
    permissions.sort(key=lambda item: (item.get("module", ""), item.get("section", ""), item.get("action", "")))
    grouped: Dict[str, Dict[str, List[dict]]] = {}
    for permission in permissions:
        module = permission.get("module") or permission.get("catalog") or "platform"
        section = permission.get("section") or permission.get("feature") or "general"
        grouped.setdefault(module, {}).setdefault(section, []).append(permission)
    return {"permissions": permissions, "grouped": grouped}


@api.patch("/admin/rbac/roles/{role_name}/permissions")
async def admin_rbac_update_role_permissions(role_name: str, payload: dict, request: Request, user: User = Depends(require_permission("roles.permissions.modify"))):
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
async def admin_rbac_users(_: User = Depends(require_permission("users.profile.view"))):
    users = await admin_list_users(_)
    for item in users:
        user_model = User(**item)
        item["effective_permissions"] = await _effective_permission_levels(user_model)
        item["effective_permission_count"] = len(item["effective_permissions"])
    return users


@api.patch("/admin/rbac/users/{user_id}/roles")
async def admin_rbac_replace_user_roles(user_id: str, payload: dict, request: Request, user: User = Depends(require_permission("users.roles.assign"))):
    requested = [_normalize_role(role) for role in payload.get("roles", []) if role]
    if not requested:
        raise HTTPException(400, "Every user must have at least one role")
    if user_id == user.user_id:
        current_roles = await _active_user_roles(user_id)
        had_admin = any(role in {"administrador_sitio", "administrador_profesor"} for role in current_roles)
        keeps_admin = any(role in {"administrador_sitio", "administrador_profesor"} for role in requested)
        if had_admin and not keeps_admin:
            raise HTTPException(400, "Cannot remove your own last admin access")
    if "administrador_sitio" in requested and not payload.get("confirmPrivileged"):
        raise HTTPException(400, "Assigning Super Admin requires confirmation")
    return await admin_update_user_roles(user_id, {"roles": requested}, request, user)


@api.post("/admin/rbac/users/bulk-roles")
async def admin_rbac_bulk_roles(payload: dict, request: Request, user: User = Depends(require_permission("users.roles.assign"))):
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
    return {k: s.get(k, "") for k in PUBLIC_SETTINGS_FIELDS}


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
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    await close_pool()
