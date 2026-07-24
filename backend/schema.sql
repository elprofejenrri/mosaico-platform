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
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_school_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'alumno';

CREATE TABLE IF NOT EXISTS auth_providers (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO auth_providers (code, label) VALUES
    ('supabase', 'Supabase social auth'),
    ('local', 'Local email/password')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

CREATE TABLE IF NOT EXISTS user_profile_types (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO user_profile_types (code, label) VALUES
    ('client', 'Client learner'),
    ('student', 'Student'),
    ('parent', 'Parent'),
    ('tutor', 'Tutor or guardian')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

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

CREATE TABLE IF NOT EXISTS product_types (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO product_types (code, label) VALUES
    ('trial', 'Trial class'),
    ('single', 'Single class'),
    ('package', 'Lesson package'),
    ('subscription', 'Subscription')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

CREATE TABLE IF NOT EXISTS language_catalog (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO language_catalog (code, label) VALUES
    ('es', 'Spanish'),
    ('en', 'English')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

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
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS school_id TEXT;

CREATE TABLE IF NOT EXISTS booking_statuses (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO booking_statuses (code, label) VALUES
    ('confirmed', 'Confirmed'),
    ('scheduled', 'Scheduled'),
    ('completed', 'Completed'),
    ('cancelled', 'Cancelled')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

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
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS original_payment_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refunded_at TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TEXT;

CREATE TABLE IF NOT EXISTS payment_statuses (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO payment_statuses (code, label) VALUES
    ('initiated', 'Initiated'),
    ('paid', 'Paid'),
    ('refunded', 'Refunded'),
    ('unpaid', 'Unpaid'),
    ('no_payment_required', 'No payment required')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

CREATE TABLE IF NOT EXISTS checkout_statuses (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO checkout_statuses (code, label) VALUES
    ('open', 'Open'),
    ('complete', 'Complete'),
    ('rejected', 'Rejected'),
    ('refunded', 'Refunded'),
    ('expired', 'Expired')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

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
ALTER TABLE roles ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'system';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'self';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT FALSE;

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
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT '';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT '';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT '';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT TRUE;

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
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS allowed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}';

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
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_at TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS expires_at TEXT;

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_school_memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    membership_type TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, school_id, membership_type)
);

CREATE TABLE IF NOT EXISTS tutor_student_links (
    id TEXT PRIMARY KEY,
    tutor_user_id TEXT NOT NULL,
    student_user_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'guardian',
    status TEXT NOT NULL DEFAULT 'active',
    authorized_at TEXT,
    authorized_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tutor_user_id, student_user_id, school_id)
);

CREATE TABLE IF NOT EXISTS teacher_student_assignments (
    id TEXT PRIMARY KEY,
    teacher_user_id TEXT NOT NULL,
    student_user_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    course_id TEXT,
    class_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_movements (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT NOT NULL,
    account_user_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    balance_before DOUBLE PRECISION NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    balance_after DOUBLE PRECISION NOT NULL,
    movement_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    reference_type TEXT,
    reference_id TEXT,
    ip_address TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS student_profile_statuses (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO student_profile_statuses (code, label) VALUES
    ('activo', 'Active'),
    ('pausado', 'Paused'),
    ('inactivo', 'Inactive')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

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

CREATE TABLE IF NOT EXISTS page_statuses (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO page_statuses (code, label) VALUES
    ('draft', 'Draft'),
    ('published', 'Published'),
    ('archived', 'Archived')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

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

CREATE TABLE IF NOT EXISTS media_types (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO media_types (code, label) VALUES
    ('image', 'Image'),
    ('video', 'Video'),
    ('document', 'Document'),
    ('file', 'File')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

CREATE TABLE IF NOT EXISTS login_history (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    email       TEXT NOT NULL,
    provider    TEXT NOT NULL DEFAULT 'google',
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_providers (
    code        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT now()::TEXT
);
INSERT INTO login_providers (code, label) VALUES
    ('google', 'Google social login'),
    ('local_password', 'Local password login'),
    ('local_password_register', 'Local password registration')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

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

CREATE TABLE IF NOT EXISTS audit_events (
    id             TEXT PRIMARY KEY,
    actor_user_id  TEXT,
    actor_name     TEXT,
    target_user_id TEXT,
    event_type     TEXT NOT NULL,
    action         TEXT,
    entity_type    TEXT NOT NULL,
    target_type    TEXT,
    entity_id      TEXT,
    target_id      TEXT,
    before_state   JSONB NOT NULL DEFAULT '{}',
    after_state    JSONB NOT NULL DEFAULT '{}',
    metadata       JSONB NOT NULL DEFAULT '{}',
    ip_address     TEXT,
    user_agent     TEXT,
    risk_level     TEXT NOT NULL DEFAULT 'low',
    created_at     TEXT NOT NULL
);

ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS before_state JSONB NOT NULL DEFAULT '{}';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS after_state JSONB NOT NULL DEFAULT '{}';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_role_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS permission_code TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS result TEXT NOT NULL DEFAULT 'success';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS denial_reason TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE TABLE IF NOT EXISTS activity_logs (
    id             TEXT PRIMARY KEY,
    actor_user_id  TEXT,
    actor_name     TEXT,
    event_type     TEXT NOT NULL,
    action         TEXT NOT NULL,
    target_type    TEXT NOT NULL,
    target_id      TEXT,
    summary        TEXT NOT NULL,
    metadata       JSONB NOT NULL DEFAULT '{}',
    visibility     TEXT NOT NULL DEFAULT 'admin',
    created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id          TEXT PRIMARY KEY,
    event_name  TEXT NOT NULL,
    user_id     TEXT,
    role        TEXT,
    session_id  TEXT,
    module      TEXT,
    entity_type TEXT,
    entity_id   TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS error_events (
    id          TEXT PRIMARY KEY,
    request_id  TEXT NOT NULL,
    user_id     TEXT,
    code        TEXT NOT NULL,
    message     TEXT NOT NULL,
    details     JSONB NOT NULL DEFAULT '{}',
    path        TEXT,
    method      TEXT,
    status_code INTEGER,
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_volumes (
    id                TEXT PRIMARY KEY,
    number            INTEGER NOT NULL,
    title             TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,
    description       TEXT NOT NULL DEFAULT '',
    owner_user_id     TEXT,
    owner_role        TEXT,
    status            TEXT NOT NULL DEFAULT 'draft',
    current_version   TEXT NOT NULL DEFAULT '0.1.0',
    visibility        TEXT NOT NULL DEFAULT 'super_admin_only',
    estimated_pages   INTEGER NOT NULL DEFAULT 0,
    priority          TEXT NOT NULL DEFAULT 'medium',
    tags              JSONB NOT NULL DEFAULT '[]',
    linked_volume_ids JSONB NOT NULL DEFAULT '[]',
    purpose           TEXT NOT NULL DEFAULT '',
    suggested_sections JSONB NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    approved_at       TEXT,
    deprecated_at     TEXT
);

CREATE TABLE IF NOT EXISTS atlas_sections (
    id                    TEXT PRIMARY KEY,
    volume_id             TEXT NOT NULL,
    parent_section_id     TEXT,
    title                 TEXT NOT NULL,
    slug                  TEXT NOT NULL,
    order_index           INTEGER NOT NULL DEFAULT 0,
    summary               TEXT NOT NULL DEFAULT '',
    content_markdown      TEXT NOT NULL DEFAULT '',
    status                TEXT NOT NULL DEFAULT 'draft',
    tags                  JSONB NOT NULL DEFAULT '[]',
    linked_decision_ids   JSONB NOT NULL DEFAULT '[]',
    linked_glossary_terms JSONB NOT NULL DEFAULT '[]',
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_versions (
    id                 TEXT PRIMARY KEY,
    volume_id          TEXT NOT NULL,
    version            TEXT NOT NULL,
    version_type       TEXT NOT NULL DEFAULT 'minor',
    change_summary     TEXT NOT NULL DEFAULT '',
    content_snapshot   JSONB NOT NULL DEFAULT '{}',
    created_by_user_id TEXT,
    created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_decision_logs (
    id                       TEXT PRIMARY KEY,
    title                    TEXT NOT NULL,
    decision_type            TEXT NOT NULL DEFAULT 'product',
    context                  TEXT NOT NULL DEFAULT '',
    decision                 TEXT NOT NULL DEFAULT '',
    alternatives_considered  TEXT NOT NULL DEFAULT '',
    consequences             TEXT NOT NULL DEFAULT '',
    owner_user_id            TEXT,
    status                   TEXT NOT NULL DEFAULT 'proposed',
    linked_volume_ids        JSONB NOT NULL DEFAULT '[]',
    linked_section_ids       JSONB NOT NULL DEFAULT '[]',
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_reviews (
    id               TEXT PRIMARY KEY,
    volume_id        TEXT NOT NULL,
    section_id       TEXT,
    reviewer_user_id TEXT,
    status           TEXT NOT NULL DEFAULT 'pending',
    comments         TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_comments (
    id             TEXT PRIMARY KEY,
    volume_id      TEXT NOT NULL,
    section_id     TEXT,
    author_user_id TEXT,
    body           TEXT NOT NULL,
    resolved       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_glossary_terms (
    id                TEXT PRIMARY KEY,
    term              TEXT NOT NULL UNIQUE,
    definition        TEXT NOT NULL DEFAULT '',
    related_terms     JSONB NOT NULL DEFAULT '[]',
    linked_volume_ids JSONB NOT NULL DEFAULT '[]',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_attachments (
    id                  TEXT PRIMARY KEY,
    volume_id           TEXT NOT NULL,
    section_id          TEXT,
    filename            TEXT NOT NULL,
    file_url            TEXT NOT NULL,
    mime_type           TEXT,
    uploaded_by_user_id TEXT,
    created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS atlas_audit_logs (
    id            TEXT PRIMARY KEY,
    actor_user_id TEXT,
    action        TEXT NOT NULL,
    target_type   TEXT NOT NULL,
    target_id     TEXT,
    before_state  JSONB NOT NULL DEFAULT '{}',
    after_state   JSONB NOT NULL DEFAULT '{}',
    metadata      JSONB NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);
CREATE INDEX IF NOT EXISTS idx_availability_teacher ON availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_assets(type);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_local_auth_sessions_token ON local_auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_local_auth_sessions_user ON local_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_risk ON audit_events(risk_level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_module ON analytics_events(module);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_error_events_request ON error_events(request_id);
CREATE INDEX IF NOT EXISTS idx_error_events_code ON error_events(code);
CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at);
CREATE INDEX IF NOT EXISTS idx_atlas_volumes_slug ON atlas_volumes(slug);
CREATE INDEX IF NOT EXISTS idx_atlas_volumes_status ON atlas_volumes(status);
CREATE INDEX IF NOT EXISTS idx_atlas_sections_volume ON atlas_sections(volume_id);
CREATE INDEX IF NOT EXISTS idx_atlas_versions_volume ON atlas_versions(volume_id);
CREATE INDEX IF NOT EXISTS idx_atlas_decisions_status ON atlas_decision_logs(status);
CREATE INDEX IF NOT EXISTS idx_atlas_reviews_volume ON atlas_reviews(volume_id);
CREATE INDEX IF NOT EXISTS idx_atlas_glossary_term ON atlas_glossary_terms(term);
CREATE INDEX IF NOT EXISTS idx_atlas_audit_target ON atlas_audit_logs(target_type, target_id);

-- RBAC v2 scope and tenancy indexes. The legacy unique constraint did not
-- permit the same user to hold one role in more than one school.
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_scope
    ON user_roles(user_id, role_name, COALESCE(school_id, ''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_code ON roles(code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_permissions_code ON permissions(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_school ON user_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON user_roles(status, active);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON user_school_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_school ON user_school_memberships(school_id, status);
CREATE INDEX IF NOT EXISTS idx_tutor_links_tutor ON tutor_student_links(tutor_user_id, status);
CREATE INDEX IF NOT EXISTS idx_tutor_links_student ON tutor_student_links(student_user_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_student_assignments(teacher_user_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_student ON teacher_student_assignments(student_user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_school ON bookings(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_school ON payment_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_credit_movements_school ON credit_movements(school_id);
CREATE INDEX IF NOT EXISTS idx_credit_movements_actor ON credit_movements(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_permission ON audit_events(permission_code, result);
CREATE INDEX IF NOT EXISTS idx_audit_school ON audit_events(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_action_resource ON audit_events(action, entity_type);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_membership_user') THEN
        ALTER TABLE user_school_memberships ADD CONSTRAINT fk_membership_user
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_membership_school') THEN
        ALTER TABLE user_school_memberships ADD CONSTRAINT fk_membership_school
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tutor_link_tutor') THEN
        ALTER TABLE tutor_student_links ADD CONSTRAINT fk_tutor_link_tutor
            FOREIGN KEY (tutor_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tutor_link_student') THEN
        ALTER TABLE tutor_student_links ADD CONSTRAINT fk_tutor_link_student
            FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_assignment_teacher') THEN
        ALTER TABLE teacher_student_assignments ADD CONSTRAINT fk_teacher_assignment_teacher
            FOREIGN KEY (teacher_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_assignment_student') THEN
        ALTER TABLE teacher_student_assignments ADD CONSTRAINT fk_teacher_assignment_student
            FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_school') THEN
        ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_school
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_active_school') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_active_school
            FOREIGN KEY (active_school_id) REFERENCES schools(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_school') THEN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_school
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_school') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT fk_payments_school
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_credit_movements_school') THEN
        ALTER TABLE credit_movements ADD CONSTRAINT fk_credit_movements_school
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_credit_movements_actor') THEN
        ALTER TABLE credit_movements ADD CONSTRAINT fk_credit_movements_actor
            FOREIGN KEY (actor_user_id) REFERENCES users(user_id) ON DELETE RESTRICT NOT VALID;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_profile_type ON users(profile_type);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_teacher ON products(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_product ON bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_profile ON bookings(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_product ON payment_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_teacher ON teacher_profiles(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_name);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_role') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role) REFERENCES roles(name) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_auth_provider') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_auth_provider FOREIGN KEY (auth_provider) REFERENCES auth_providers(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_profile_type') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_profile_type FOREIGN KEY (profile_type) REFERENCES user_profile_types(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_type') THEN
        ALTER TABLE products ADD CONSTRAINT fk_products_type FOREIGN KEY (type) REFERENCES product_types(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_language') THEN
        ALTER TABLE products ADD CONSTRAINT fk_products_language FOREIGN KEY (language) REFERENCES language_catalog(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_teacher') THEN
        ALTER TABLE products ADD CONSTRAINT fk_products_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_availability_teacher') THEN
        ALTER TABLE availability ADD CONSTRAINT fk_availability_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_user') THEN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(user_id) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_product') THEN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_product FOREIGN KEY (product_id) REFERENCES products(id) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_teacher') THEN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_student_profile') THEN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_student_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_status') THEN
        ALTER TABLE bookings ADD CONSTRAINT fk_bookings_status FOREIGN KEY (status) REFERENCES booking_statuses(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_transactions_user') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_user FOREIGN KEY (user_id) REFERENCES users(user_id) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_transactions_product') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_product FOREIGN KEY (product_id) REFERENCES products(id) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_transactions_payment_status') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_payment_status FOREIGN KEY (payment_status) REFERENCES payment_statuses(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_transactions_status') THEN
        ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_status FOREIGN KEY (status) REFERENCES checkout_statuses(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_role_permissions_role') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_name) REFERENCES roles(name) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_role_permissions_permission') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission) REFERENCES permissions(name) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_user') THEN
        ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_role') THEN
        ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_name) REFERENCES roles(name) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_profiles_user') THEN
        ALTER TABLE teacher_profiles ADD CONSTRAINT fk_teacher_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teacher_profiles_teacher') THEN
        ALTER TABLE teacher_profiles ADD CONSTRAINT fk_teacher_profiles_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_profiles_user') THEN
        ALTER TABLE student_profiles ADD CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_profiles_status') THEN
        ALTER TABLE student_profiles ADD CONSTRAINT fk_student_profiles_status FOREIGN KEY (status) REFERENCES student_profile_statuses(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pages_language') THEN
        ALTER TABLE pages ADD CONSTRAINT fk_pages_language FOREIGN KEY (language) REFERENCES language_catalog(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pages_status') THEN
        ALTER TABLE pages ADD CONSTRAINT fk_pages_status FOREIGN KEY (status) REFERENCES page_statuses(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_type') THEN
        ALTER TABLE media_assets ADD CONSTRAINT fk_media_assets_type FOREIGN KEY (type) REFERENCES media_types(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_login_history_user') THEN
        ALTER TABLE login_history ADD CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_login_history_provider') THEN
        ALTER TABLE login_history ADD CONSTRAINT fk_login_history_provider FOREIGN KEY (provider) REFERENCES login_providers(code) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_local_auth_sessions_user') THEN
        ALTER TABLE local_auth_sessions ADD CONSTRAINT fk_local_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_events_actor') THEN
        ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_events_target') THEN
        ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_target FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL NOT VALID;
    END IF;
END $$;
