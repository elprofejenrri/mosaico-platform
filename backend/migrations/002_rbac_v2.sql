-- MOSAICO RBAC v2 upgrade.
-- Canonical executable schema remains backend/schema.sql; this migration is
-- supplied for controlled deployments that do not auto-apply the full schema.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_school_id TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'self';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS allowed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}';
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_at TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS expires_at TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS original_payment_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refunded_at TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_role_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS permission_code TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS result TEXT NOT NULL DEFAULT 'success';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS denial_reason TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS request_id TEXT;

INSERT INTO payment_statuses (code, label) VALUES ('refunded', 'Refunded')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;
INSERT INTO checkout_statuses (code, label) VALUES
    ('rejected', 'Rejected'), ('refunded', 'Refunded')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_school_memberships (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, school_id TEXT NOT NULL,
    membership_type TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(user_id, school_id, membership_type)
);
CREATE TABLE IF NOT EXISTS tutor_student_links (
    id TEXT PRIMARY KEY, tutor_user_id TEXT NOT NULL, student_user_id TEXT NOT NULL,
    school_id TEXT NOT NULL, relationship_type TEXT NOT NULL DEFAULT 'guardian',
    status TEXT NOT NULL DEFAULT 'active', authorized_at TEXT, authorized_by TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(tutor_user_id, student_user_id, school_id)
);
CREATE TABLE IF NOT EXISTS teacher_student_assignments (
    id TEXT PRIMARY KEY, teacher_user_id TEXT NOT NULL, student_user_id TEXT NOT NULL,
    school_id TEXT NOT NULL, course_id TEXT, class_id TEXT, status TEXT NOT NULL DEFAULT 'active',
    starts_at TEXT, ends_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS credit_movements (
    id TEXT PRIMARY KEY, actor_user_id TEXT NOT NULL, account_user_id TEXT NOT NULL,
    school_id TEXT NOT NULL, balance_before DOUBLE PRECISION NOT NULL,
    amount DOUBLE PRECISION NOT NULL, balance_after DOUBLE PRECISION NOT NULL,
    movement_type TEXT NOT NULL, reason TEXT NOT NULL, transaction_id TEXT NOT NULL UNIQUE,
    reference_type TEXT, reference_id TEXT, ip_address TEXT,
    metadata JSONB NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_scope ON user_roles(user_id, role_name, COALESCE(school_id, ''));
CREATE INDEX IF NOT EXISTS idx_user_roles_school ON user_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_memberships_school ON user_school_memberships(school_id, status);
CREATE INDEX IF NOT EXISTS idx_tutor_links_tutor ON tutor_student_links(tutor_user_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_student_assignments(teacher_user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_permission ON audit_events(permission_code, result);
CREATE INDEX IF NOT EXISTS idx_audit_school ON audit_events(school_id);

DO $$
BEGIN
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
END $$;

COMMIT;
