BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_normalized TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE TABLE IF NOT EXISTS auth_identities (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    provider            TEXT NOT NULL,
    provider_user_id    TEXT NOT NULL,
    email_normalized    TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    UNIQUE(provider, provider_user_id)
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_completed_at TEXT;

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS native_language TEXT NOT NULL DEFAULT '';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS learning_language TEXT NOT NULL DEFAULT '';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS self_reported_level TEXT NOT NULL DEFAULT '';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS current_level TEXT NOT NULL DEFAULT '';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS learning_goal TEXT NOT NULL DEFAULT '';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS preferred_class_format TEXT NOT NULL DEFAULT '';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS general_availability TEXT NOT NULL DEFAULT '';

ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS professional_bio TEXT NOT NULL DEFAULT '';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS languages_taught JSONB NOT NULL DEFAULT '[]';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS authorized_levels JSONB NOT NULL DEFAULT '[]';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS teaching_modalities JSONB NOT NULL DEFAULT '[]';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS experience_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'incomplete';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS approval_submitted_at TEXT;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS approved_at TEXT;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS suspended_at TEXT;

CREATE TABLE IF NOT EXISTS tutor_profiles (
    id                      TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL UNIQUE,
    relationship_context    TEXT NOT NULL DEFAULT '',
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding_states (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    onboarding_type     TEXT NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    status              TEXT NOT NULL DEFAULT 'not_started',
    current_step        TEXT NOT NULL DEFAULT 'profile',
    completed_steps     JSONB NOT NULL DEFAULT '[]',
    blocked_reason      TEXT,
    started_at          TEXT,
    last_saved_at       TEXT,
    completed_at        TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    UNIQUE(user_id, onboarding_type, version)
);

CREATE INDEX IF NOT EXISTS idx_users_email_normalized ON users(email_normalized);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_identity
    ON users(auth_provider, auth_provider_user_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_email ON auth_identities(email_normalized);
CREATE INDEX IF NOT EXISTS idx_student_profiles_status ON student_profiles(status);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_approval ON teacher_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_status
    ON onboarding_states(user_id, status);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auth_identities_user') THEN
        ALTER TABLE auth_identities ADD CONSTRAINT fk_auth_identities_user
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tutor_profiles_user') THEN
        ALTER TABLE tutor_profiles ADD CONSTRAINT fk_tutor_profiles_user
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_onboarding_states_user') THEN
        ALTER TABLE onboarding_states ADD CONSTRAINT fk_onboarding_states_user
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_account_status') THEN
        ALTER TABLE users ADD CONSTRAINT ck_users_account_status
            CHECK (status IN ('pending_profile','pending_approval','active','suspended','inactive')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_teacher_approval_status') THEN
        ALTER TABLE teacher_profiles ADD CONSTRAINT ck_teacher_approval_status
            CHECK (approval_status IN ('incomplete','pending','approved','rejected','suspended')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_onboarding_status') THEN
        ALTER TABLE onboarding_states ADD CONSTRAINT ck_onboarding_status
            CHECK (status IN ('not_started','in_progress','completed','blocked','requires_review')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_onboarding_type') THEN
        ALTER TABLE onboarding_states ADD CONSTRAINT ck_onboarding_type
            CHECK (onboarding_type IN ('student','teacher')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_profile_completion_percentage') THEN
        ALTER TABLE user_profiles ADD CONSTRAINT ck_profile_completion_percentage
            CHECK (profile_completion_percentage BETWEEN 0 AND 100) NOT VALID;
    END IF;
END $$;

-- Unique email enforcement is intentionally conditional. Existing production
-- duplicates must be reviewed rather than made undeployable or merged.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE NULLIF(lower(trim(email)), '') IS NOT NULL
        GROUP BY lower(trim(email)) HAVING count(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_normalized_safe
            ON users ((lower(trim(email))));
    END IF;
END $$;

COMMIT;
