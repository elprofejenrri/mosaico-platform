-- MOSAICO / Lily Spanish — Supabase (PostgreSQL) schema
-- Run in Supabase SQL Editor or let the backend auto-apply on startup.

CREATE TABLE IF NOT EXISTS users (
    user_id     TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL DEFAULT '',
    picture     TEXT,
    role        TEXT NOT NULL DEFAULT 'student',
    created_at  TEXT NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'supabase';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_type TEXT NOT NULL DEFAULT 'client';
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT;

CREATE TABLE IF NOT EXISTS products (
    id                TEXT PRIMARY KEY,
    slug              TEXT NOT NULL,
    name_en           TEXT NOT NULL,
    name_es           TEXT NOT NULL,
    description_en    TEXT NOT NULL DEFAULT '',
    description_es    TEXT NOT NULL DEFAULT '',
    duration_min      INTEGER NOT NULL DEFAULT 0,
    sessions_included INTEGER NOT NULL DEFAULT 1,
    price_usd         DOUBLE PRECISION NOT NULL,
    type              TEXT NOT NULL,
    popular           BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE products ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'es';
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS availability (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    start_time  TEXT NOT NULL,
    available   BOOLEAN NOT NULL DEFAULT TRUE,
    teacher_id  TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    user_email          TEXT NOT NULL,
    user_name           TEXT NOT NULL DEFAULT '',
    product_id          TEXT NOT NULL,
    product_name        TEXT NOT NULL,
    duration_min        INTEGER NOT NULL,
    scheduled_date      TEXT NOT NULL,
    scheduled_time      TEXT NOT NULL,
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    status              TEXT NOT NULL DEFAULT 'confirmed',
    meeting_link        TEXT,
    notes               TEXT,
    payment_session_id  TEXT,
    teacher_id          TEXT,
    teacher_name        TEXT,
    created_at          TEXT NOT NULL
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS student_profile_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS blog_posts (
    id          TEXT PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    title_en    TEXT NOT NULL,
    title_es    TEXT NOT NULL,
    excerpt_en  TEXT NOT NULL DEFAULT '',
    excerpt_es  TEXT NOT NULL DEFAULT '',
    body_en     TEXT NOT NULL DEFAULT '',
    body_es     TEXT NOT NULL DEFAULT '',
    cover_image TEXT NOT NULL DEFAULT '',
    published   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    bio_en     TEXT NOT NULL DEFAULT '',
    bio_es     TEXT NOT NULL DEFAULT '',
    picture    TEXT NOT NULL DEFAULT '',
    languages  JSONB NOT NULL DEFAULT '["es","en"]',
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL
);

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS specialties JSONB NOT NULL DEFAULT '[]';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS availability JSONB NOT NULL DEFAULT '[]';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS payment_transactions (
    session_id       TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    user_email       TEXT NOT NULL,
    product_id       TEXT NOT NULL,
    amount           DOUBLE PRECISION NOT NULL,
    currency         TEXT NOT NULL DEFAULT 'usd',
    payment_status   TEXT NOT NULL DEFAULT 'initiated',
    status           TEXT NOT NULL DEFAULT 'open',
    metadata         JSONB NOT NULL DEFAULT '{}',
    booking_created  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
    id                  TEXT PRIMARY KEY,
    storage_path        TEXT NOT NULL UNIQUE,
    original_filename   TEXT,
    content_type        TEXT,
    size                INTEGER NOT NULL DEFAULT 0,
    uploaded_by         TEXT NOT NULL,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
    id       TEXT PRIMARY KEY,
    document JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    label       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    level       INTEGER NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TEXT NOT NULL
);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS permissions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    label       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    catalog     TEXT NOT NULL DEFAULT 'platform',
    feature     TEXT NOT NULL DEFAULT '',
    action      TEXT NOT NULL DEFAULT '',
    level       INTEGER NOT NULL DEFAULT 1,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TEXT NOT NULL
);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS catalog TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT '';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS role_permissions (
    id            TEXT PRIMARY KEY,
    role_name     TEXT NOT NULL,
    permission    TEXT NOT NULL,
    level         INTEGER NOT NULL DEFAULT 1,
    scope         TEXT NOT NULL DEFAULT 'global',
    created_at    TEXT NOT NULL,
    UNIQUE(role_name, permission)
);
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'global';
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS user_roles (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    role_name   TEXT NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_by TEXT,
    created_at  TEXT NOT NULL,
    UNIQUE(user_id, role_name)
);
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_by TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS teacher_profiles (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL UNIQUE,
    teacher_id          TEXT,
    specialties         JSONB NOT NULL DEFAULT '[]',
    assigned_products   JSONB NOT NULL DEFAULT '[]',
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id                 TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL UNIQUE,
    phone              TEXT NOT NULL DEFAULT '',
    enrolled_products  JSONB NOT NULL DEFAULT '[]',
    notes              TEXT NOT NULL DEFAULT '',
    status             TEXT NOT NULL DEFAULT 'activo',
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
    id                TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    slug              TEXT NOT NULL,
    language          TEXT NOT NULL DEFAULT 'es',
    status            TEXT NOT NULL DEFAULT 'draft',
    meta_title        TEXT NOT NULL DEFAULT '',
    meta_description  TEXT NOT NULL DEFAULT '',
    content_blocks    JSONB NOT NULL DEFAULT '[]',
    hero_image        TEXT NOT NULL DEFAULT '',
    created_by        TEXT,
    updated_by        TEXT,
    published_date    TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    UNIQUE(slug, language)
);

CREATE TABLE IF NOT EXISTS media_assets (
    id           TEXT PRIMARY KEY,
    file_name    TEXT NOT NULL,
    url          TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'image',
    alt_text     TEXT NOT NULL DEFAULT '',
    uploaded_by  TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_history (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    email       TEXT NOT NULL,
    provider    TEXT NOT NULL DEFAULT 'google',
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_auth_sessions (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    token_hash    TEXT NOT NULL UNIQUE,
    expires_at    TEXT NOT NULL,
    revoked_at    TEXT,
    created_at    TEXT NOT NULL,
    last_seen_at  TEXT,
    ip_address    TEXT,
    user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);
CREATE INDEX IF NOT EXISTS idx_availability_teacher ON availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_assets(type);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_local_auth_sessions_token ON local_auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_local_auth_sessions_user ON local_auth_sessions(user_id);
