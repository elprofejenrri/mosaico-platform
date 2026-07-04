"""PostgreSQL (Supabase) database layer with a MongoDB-compatible collection API."""
from __future__ import annotations

import json
import logging
import os
import ssl
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import asyncpg

logger = logging.getLogger("lily.db")

_pool: Optional[asyncpg.Pool] = None

TABLE_COLUMNS: Dict[str, List[str]] = {
    "users": ["user_id", "email", "name", "picture", "role", "created_at", "google_id", "password_hash", "auth_provider", "profile_type", "active", "updated_at", "last_login_at"],
    "products": [
        "id", "slug", "name_en", "name_es", "description_en", "description_es",
        "duration_min", "sessions_included", "price_usd", "type", "popular",
        "currency", "teacher_id", "capacity", "active", "image", "language", "created_at", "updated_at",
    ],
    "availability": ["id", "date", "start_time", "available", "teacher_id"],
    "bookings": [
        "id", "user_id", "user_email", "user_name", "product_id", "product_name",
        "duration_min", "scheduled_date", "scheduled_time", "timezone", "status",
        "meeting_link", "notes", "payment_session_id", "teacher_id", "teacher_name",
        "created_at", "end_time", "student_profile_id", "updated_at",
    ],
    "blog_posts": [
        "id", "slug", "title_en", "title_es", "excerpt_en", "excerpt_es",
        "body_en", "body_es", "cover_image", "published", "created_at",
    ],
    "teachers": [
        "id", "name", "email", "bio_en", "bio_es", "picture", "languages",
        "active", "created_at", "user_id", "specialties", "availability", "updated_at",
    ],
    "payment_transactions": [
        "session_id", "user_id", "user_email", "product_id", "amount", "currency",
        "payment_status", "status", "metadata", "booking_created", "created_at",
    ],
    "files": [
        "id", "storage_path", "original_filename", "content_type", "size",
        "uploaded_by", "is_deleted", "created_at",
    ],
    "roles": ["id", "name", "label", "description", "level", "type", "status", "active", "created_at", "updated_at"],
    "permissions": ["id", "name", "label", "description", "catalog", "module", "section", "feature", "action", "risk_level", "level", "active", "created_at", "updated_at"],
    "role_permissions": ["id", "role_name", "permission", "level", "scope", "created_at", "updated_at"],
    "user_roles": ["id", "user_id", "role_name", "active", "assigned_by", "created_at", "updated_at"],
    "teacher_profiles": ["id", "user_id", "teacher_id", "specialties", "assigned_products", "created_at", "updated_at"],
    "student_profiles": ["id", "user_id", "phone", "enrolled_products", "notes", "status", "created_at", "updated_at"],
    "pages": ["id", "title", "slug", "language", "status", "meta_title", "meta_description", "content_blocks", "hero_image", "created_by", "updated_by", "published_date", "created_at", "updated_at"],
    "media_assets": ["id", "file_name", "url", "type", "alt_text", "uploaded_by", "created_at", "updated_at"],
    "login_history": ["id", "user_id", "email", "provider", "ip_address", "user_agent", "created_at"],
    "local_auth_sessions": ["id", "user_id", "token_hash", "expires_at", "revoked_at", "created_at", "last_seen_at", "ip_address", "user_agent"],
    "audit_events": ["id", "actor_user_id", "target_user_id", "event_type", "entity_type", "entity_id", "metadata", "ip_address", "user_agent", "created_at"],
}

JSONB_COLUMNS = {
    "teachers": {"languages", "specialties", "availability"},
    "payment_transactions": {"metadata"},
    "teacher_profiles": {"specialties", "assigned_products"},
    "student_profiles": {"enrolled_products"},
    "pages": {"content_blocks"},
    "audit_events": {"metadata"},
}

BOOL_COLUMNS = {
    "users": {"active"},
    "products": {"popular", "active"},
    "availability": {"available"},
    "blog_posts": {"published"},
    "teachers": {"active"},
    "payment_transactions": {"booking_created"},
    "files": {"is_deleted"},
    "roles": {"active"},
    "permissions": {"active"},
    "user_roles": {"active"},
}


class UpdateResult:
    def __init__(self, matched_count: int = 0, modified_count: int = 0):
        self.matched_count = matched_count
        self.modified_count = modified_count


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL (or SUPABASE_DB_URL) is required. "
            "Use the Supabase connection string (Session pooler, port 5432 or 6543)."
        )
    return url


async def init_pool() -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        return _pool

    schema_path = Path(__file__).parent / "schema.sql"
    schema_sql = schema_path.read_text(encoding="utf-8")
    dsn = _database_url()

    connect_kwargs: dict = {}
    ssl_mode = os.environ.get("DATABASE_SSL", "").lower()
    if ssl_mode in ("verify-full", "verify_ca", "verify-ca"):
        connect_kwargs["ssl"] = ssl.create_default_context()
    elif "supabase.co" in dsn or ssl_mode in ("1", "true", "require"):
        connect_kwargs["ssl"] = "require"

    _pool = await asyncpg.create_pool(
        dsn,
        min_size=1,
        max_size=10,
        command_timeout=60,
        **connect_kwargs,
    )

    async with _pool.acquire() as conn:
        await conn.execute(schema_sql)
    logger.info("PostgreSQL pool ready (Supabase)")
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def _encode_value(table: str, col: str, value: Any) -> Any:
    if col in JSONB_COLUMNS.get(table, set()) and value is not None:
        if isinstance(value, str):
            return value
        return json.dumps(value)
    return value


def _decode_row(table: str, row: asyncpg.Record) -> dict:
    doc = dict(row)
    for col in JSONB_COLUMNS.get(table, set()):
        if col in doc and doc[col] is not None:
            if isinstance(doc[col], str):
                doc[col] = json.loads(doc[col])
    return doc


def _apply_projection(doc: dict, projection: Optional[dict]) -> dict:
    if not projection:
        return doc
    include_only = any(v == 1 for k, v in projection.items() if k != "_id")
    if include_only:
        keys = {k for k, v in projection.items() if v == 1}
        return {k: doc[k] for k in keys if k in doc}
    excluded = {k for k, v in projection.items() if v == 0 and k != "_id"}
    return {k: v for k, v in doc.items() if k not in excluded}


def _build_where(
    table: str,
    filt: dict,
    start: int = 1,
) -> Tuple[str, List[Any], int]:
    if not filt:
        return "TRUE", [], start

    parts: List[str] = []
    params: List[Any] = []
    idx = start

    for key, val in filt.items():
        if key == "$or":
            or_parts: List[str] = []
            for sub in val:
                sub_sql, sub_params, idx = _build_where(table, sub, idx)
                or_parts.append(sub_sql)
                params.extend(sub_params)
            parts.append(f"({' OR '.join(or_parts)})")
            continue

        if isinstance(val, dict):
            if "$exists" in val:
                if val["$exists"]:
                    parts.append(f"{key} IS NOT NULL")
                else:
                    parts.append(f"{key} IS NULL")
            continue

        if val is None:
            parts.append(f"{key} IS NULL")
        else:
            parts.append(f"{key} = ${idx}")
            params.append(val)
            idx += 1

    return " AND ".join(parts) if parts else "TRUE", params, idx


class FindCursor:
    def __init__(self, collection: "Collection", filt: dict, projection: Optional[dict]):
        self._collection = collection
        self._filt = filt
        self._projection = projection

    async def to_list(self, length: int) -> List[dict]:
        return await self._collection._find_many(self._filt, self._projection, limit=length)

    def __aiter__(self):
        self._iter_rows: Optional[List[dict]] = None
        self._iter_idx = 0
        return self

    async def __anext__(self) -> dict:
        if self._iter_rows is None:
            self._iter_rows = await self._collection._find_many(self._filt, self._projection)
        if self._iter_idx >= len(self._iter_rows):
            raise StopAsyncIteration
        row = self._iter_rows[self._iter_idx]
        self._iter_idx += 1
        return row


class Collection:
    def __init__(self, table: str, pool: asyncpg.Pool):
        self.table = table
        self._pool = pool
        self._is_settings = table == "site_settings"

    async def find_one(self, filt: dict, projection: Optional[dict] = None) -> Optional[dict]:
        rows = await self._find_many(filt, projection, limit=1)
        return rows[0] if rows else None

    def find(self, filt: dict, projection: Optional[dict] = None) -> FindCursor:
        return FindCursor(self, filt, projection)

    async def insert_one(self, doc: dict) -> None:
        if self._is_settings:
            await self._insert_settings(doc)
            return
        cols = [k for k in TABLE_COLUMNS[self.table] if k in doc]
        row = {k: doc.get(k) for k in cols}
        placeholders = ", ".join(f"${i + 1}" for i in range(len(cols)))
        values = [_encode_value(self.table, c, row[c]) for c in cols]
        sql = f"INSERT INTO {self.table} ({', '.join(cols)}) VALUES ({placeholders})"
        async with self._pool.acquire() as conn:
            await conn.execute(sql, *values)

    async def insert_many(self, docs: List[dict]) -> None:
        for doc in docs:
            await self.insert_one(doc)

    async def update_one(
        self,
        filt: dict,
        update: dict,
        upsert: bool = False,
    ) -> UpdateResult:
        if self._is_settings:
            return await self._update_settings(filt, update, upsert)

        sets = update.get("$set", update)
        where_sql, where_params, _ = _build_where(self.table, filt)

        set_parts: List[str] = []
        set_params: List[Any] = []
        idx = len(where_params) + 1
        for key, val in sets.items():
            set_parts.append(f"{key} = ${idx}")
            set_params.append(_encode_value(self.table, key, val))
            idx += 1

        if not set_parts:
            return UpdateResult(0, 0)

        sql = f"UPDATE {self.table} SET {', '.join(set_parts)} WHERE {where_sql}"
        async with self._pool.acquire() as conn:
            status = await conn.execute(sql, *where_params, *set_params)
            matched = int(status.split()[-1]) if status else 0
            if matched == 0 and upsert:
                merged = dict(filt)
                merged.update(sets)
                await self.insert_one(merged)
                return UpdateResult(0, 1)
            return UpdateResult(matched, matched)

    async def delete_one(self, filt: dict) -> None:
        where_sql, where_params, _ = _build_where(self.table, filt)
        sql = f"DELETE FROM {self.table} WHERE {where_sql}"
        async with self._pool.acquire() as conn:
            await conn.execute(sql, *where_params)

    async def delete_many(self, filt: dict) -> None:
        await self.delete_one(filt)

    async def count_documents(self, filt: dict) -> int:
        where_sql, where_params, _ = _build_where(self.table, filt)
        sql = f"SELECT COUNT(*) FROM {self.table} WHERE {where_sql}"
        async with self._pool.acquire() as conn:
            return await conn.fetchval(sql, *where_params)

    async def _find_many(
        self,
        filt: dict,
        projection: Optional[dict],
        limit: Optional[int] = None,
    ) -> List[dict]:
        if self._is_settings:
            doc = await self._find_settings(filt)
            if doc is None:
                return []
            return [_apply_projection(doc, projection)]

        where_sql, where_params, _ = _build_where(self.table, filt)
        limit_sql = f" LIMIT {int(limit)}" if limit else ""
        sql = f"SELECT * FROM {self.table} WHERE {where_sql}{limit_sql}"
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *where_params)
        docs = [_apply_projection(_decode_row(self.table, r), projection) for r in rows]
        return docs

    async def _insert_settings(self, doc: dict) -> None:
        doc_id = doc.get("id", "main")
        payload = {k: v for k, v in doc.items() if k != "id"}
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO site_settings (id, document) VALUES ($1, $2::jsonb)",
                doc_id,
                json.dumps(payload),
            )

    async def _find_settings(self, filt: dict) -> Optional[dict]:
        doc_id = filt.get("id", "main")
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, document FROM site_settings WHERE id = $1",
                doc_id,
            )
        if not row:
            return None
        doc = row["document"]
        if isinstance(doc, str):
            doc = json.loads(doc)
        merged = dict(doc)
        merged["id"] = row["id"]
        return merged

    async def _update_settings(
        self,
        filt: dict,
        update: dict,
        upsert: bool,
    ) -> UpdateResult:
        doc_id = filt.get("id", "main")
        sets = update.get("$set", update)
        payload = json.dumps(sets)
        async with self._pool.acquire() as conn:
            if upsert:
                status = await conn.execute(
                    """
                    INSERT INTO site_settings (id, document) VALUES ($1, $2::jsonb)
                    ON CONFLICT (id) DO UPDATE
                    SET document = site_settings.document || EXCLUDED.document
                    """,
                    doc_id,
                    payload,
                )
            else:
                status = await conn.execute(
                    """
                    UPDATE site_settings
                    SET document = document || $2::jsonb
                    WHERE id = $1
                    """,
                    doc_id,
                    payload,
                )
        matched = int(status.split()[-1]) if status else 0
        return UpdateResult(matched, matched)


class Database:
    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool
        self.users = Collection("users", pool)
        self.products = Collection("products", pool)
        self.availability = Collection("availability", pool)
        self.bookings = Collection("bookings", pool)
        self.blog_posts = Collection("blog_posts", pool)
        self.teachers = Collection("teachers", pool)
        self.payment_transactions = Collection("payment_transactions", pool)
        self.files = Collection("files", pool)
        self.site_settings = Collection("site_settings", pool)
        self.roles = Collection("roles", pool)
        self.permissions = Collection("permissions", pool)
        self.role_permissions = Collection("role_permissions", pool)
        self.user_roles = Collection("user_roles", pool)
        self.teacher_profiles = Collection("teacher_profiles", pool)
        self.student_profiles = Collection("student_profiles", pool)
        self.pages = Collection("pages", pool)
        self.media_assets = Collection("media_assets", pool)
        self.login_history = Collection("login_history", pool)
        self.local_auth_sessions = Collection("local_auth_sessions", pool)
        self.audit_events = Collection("audit_events", pool)


_db: Optional[Database] = None


async def get_database() -> Database:
    global _db
    if _db is None:
        pool = await init_pool()
        _db = Database(pool)
    return _db
