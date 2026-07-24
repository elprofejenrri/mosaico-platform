BEGIN;

CREATE TABLE IF NOT EXISTS user_profiles (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL UNIQUE,
    first_name          TEXT NOT NULL DEFAULT '',
    last_name           TEXT NOT NULL DEFAULT '',
    public_name         TEXT NOT NULL DEFAULT '',
    picture             TEXT NOT NULL DEFAULT '',
    native_language     TEXT NOT NULL DEFAULT '',
    learning_language   TEXT NOT NULL DEFAULT '',
    country             TEXT NOT NULL DEFAULT '',
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    phone               TEXT NOT NULL DEFAULT '',
    preferences         JSONB NOT NULL DEFAULT '{}',
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_role_profiles (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    role_code           TEXT NOT NULL,
    profile_data        JSONB NOT NULL DEFAULT '{}',
    approval_status     TEXT NOT NULL DEFAULT 'pending',
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    UNIQUE(user_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_profiles_user_role
    ON user_role_profiles(user_id, role_code);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_profiles_user') THEN
        ALTER TABLE user_profiles
            ADD CONSTRAINT fk_user_profiles_user
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_role_profiles_user') THEN
        ALTER TABLE user_role_profiles
            ADD CONSTRAINT fk_user_role_profiles_user
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
END $$;

-- Safe identity backfill. Role-specific details remain empty until their owner
-- or an authorized administrator supplies authoritative data.
INSERT INTO user_profiles (
    id, user_id, first_name, last_name, public_name, picture, timezone,
    created_at, updated_at
)
SELECT
    'up_' || md5(user_id), user_id,
    CASE WHEN position(' ' in trim(name)) > 0 THEN split_part(trim(name), ' ', 1) ELSE trim(name) END,
    CASE WHEN position(' ' in trim(name)) > 0 THEN substring(trim(name) from position(' ' in trim(name)) + 1) ELSE '' END,
    trim(name), COALESCE(picture, ''), 'UTC', created_at, COALESCE(updated_at, created_at)
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_role_profiles (
    id, user_id, role_code, profile_data, approval_status, created_at, updated_at
)
SELECT
    'urp_' || md5(ur.user_id || ':' || ur.role_name),
    ur.user_id,
    ur.role_name,
    '{}'::JSONB,
    CASE
        WHEN ur.role_name = 'profesor' AND EXISTS (
            SELECT 1 FROM teachers t WHERE t.user_id = ur.user_id AND t.active = TRUE
        ) THEN 'approved'
        WHEN ur.role_name = 'profesor' THEN 'pending'
        ELSE 'approved'
    END,
    COALESCE(ur.created_at, now()::TEXT),
    COALESCE(ur.updated_at, ur.created_at, now()::TEXT)
FROM user_roles ur
WHERE ur.active = TRUE
  AND ur.status = 'active'
  AND ur.role_name IN (
      'alumno', 'tutor_padre', 'profesor', 'administrador_escolar',
      'finanzas', 'administrador_profesor', 'administrador_sitio'
  )
ON CONFLICT (user_id, role_code) DO NOTHING;

COMMIT;
