BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS starts_at TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ends_at TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_utc_window
    ON bookings(teacher_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS external_calendar_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'google',
    provider_account_id TEXT NOT NULL,
    provider_email_masked TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'connected',
    granted_scopes JSONB NOT NULL DEFAULT '[]',
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TEXT,
    connected_at TEXT NOT NULL,
    last_successful_sync_at TEXT,
    last_sync_attempt_at TEXT,
    last_sync_status TEXT NOT NULL DEFAULT 'pending',
    last_sync_error_code TEXT,
    busy_cache_start_at TEXT,
    busy_cache_end_at TEXT,
    revoked_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, provider),
    CHECK (provider = 'google'),
    CHECK (status IN ('connected', 'reconnect_required', 'revoked', 'error')),
    CHECK (last_sync_status IN ('pending', 'synced', 'retrying', 'failed', 'disconnected', 'conflict', 'cancelled'))
);
ALTER TABLE external_calendar_connections
    ADD COLUMN IF NOT EXISTS busy_cache_start_at TEXT;
ALTER TABLE external_calendar_connections
    ADD COLUMN IF NOT EXISTS busy_cache_end_at TEXT;

CREATE TABLE IF NOT EXISTS external_calendar_selections (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    access_role TEXT NOT NULL,
    use_for_busy BOOLEAN NOT NULL DEFAULT FALSE,
    use_for_events BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(connection_id, calendar_id),
    CHECK (access_role IN ('freeBusyReader', 'reader', 'writer', 'owner')),
    CHECK (use_for_busy OR use_for_events)
);

CREATE TABLE IF NOT EXISTS external_busy_blocks (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    teacher_user_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'google_freebusy',
    fetched_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(connection_id, calendar_id, starts_at, ends_at),
    CHECK (source = 'google_freebusy'),
    CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS calendar_event_links (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    reservation_id TEXT,
    teacher_user_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    google_event_id TEXT NOT NULL,
    google_event_etag TEXT NOT NULL DEFAULT '',
    idempotency_key TEXT NOT NULL UNIQUE,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    last_synced_at TEXT,
    last_error_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(class_id, teacher_user_id, connection_id),
    CHECK (sync_status IN ('pending', 'synced', 'retrying', 'failed', 'disconnected', 'conflict', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS google_calendar_oauth_states (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    nonce_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_external_calendar_connections_user
    ON external_calendar_connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_external_calendar_selections_connection
    ON external_calendar_selections(connection_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_external_calendar_destination
    ON external_calendar_selections(connection_id) WHERE use_for_events;
CREATE INDEX IF NOT EXISTS idx_external_busy_blocks_teacher_window
    ON external_busy_blocks(teacher_user_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_external_busy_blocks_expiry
    ON external_busy_blocks(expires_at);
CREATE INDEX IF NOT EXISTS idx_calendar_event_links_class
    ON calendar_event_links(class_id, teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_oauth_states_expiry
    ON google_calendar_oauth_states(expires_at, used_at);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_external_calendar_connections_user') THEN
        ALTER TABLE external_calendar_connections ADD CONSTRAINT fk_external_calendar_connections_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_external_calendar_selections_connection') THEN
        ALTER TABLE external_calendar_selections ADD CONSTRAINT fk_external_calendar_selections_connection FOREIGN KEY (connection_id) REFERENCES external_calendar_connections(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_external_busy_blocks_connection') THEN
        ALTER TABLE external_busy_blocks ADD CONSTRAINT fk_external_busy_blocks_connection FOREIGN KEY (connection_id) REFERENCES external_calendar_connections(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_external_busy_blocks_user') THEN
        ALTER TABLE external_busy_blocks ADD CONSTRAINT fk_external_busy_blocks_user FOREIGN KEY (teacher_user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_event_links_connection') THEN
        ALTER TABLE calendar_event_links ADD CONSTRAINT fk_calendar_event_links_connection FOREIGN KEY (connection_id) REFERENCES external_calendar_connections(id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_event_links_user') THEN
        ALTER TABLE calendar_event_links ADD CONSTRAINT fk_calendar_event_links_user FOREIGN KEY (teacher_user_id) REFERENCES users(user_id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_google_calendar_oauth_states_user') THEN
        ALTER TABLE google_calendar_oauth_states ADD CONSTRAINT fk_google_calendar_oauth_states_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE NOT VALID;
    END IF;
END $$;

COMMIT;
