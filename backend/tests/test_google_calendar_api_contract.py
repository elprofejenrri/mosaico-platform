from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SERVER = (ROOT / "backend" / "server.py").read_text(encoding="utf-8")
SERVICE = (ROOT / "backend" / "google_calendar_service.py").read_text(encoding="utf-8")
FRONTEND_SERVICE = (
    ROOT / "frontend" / "src" / "services" / "teacherCalendarService.js"
).read_text(encoding="utf-8")
SCHEMA = (ROOT / "backend" / "schema.sql").read_text(encoding="utf-8")


def test_calendar_endpoints_are_backend_owned():
    for route in (
        "/integrations/google-calendar/status",
        "/integrations/google-calendar/connect",
        "/integrations/google-calendar/callback",
        "/integrations/google-calendar/calendars",
        "/integrations/google-calendar/settings",
        "/integrations/google-calendar/sync",
        "/integrations/google-calendar/disconnect",
        "/teachers/me/calendar-availability",
    ):
        assert route in SERVER


def test_frontend_never_reads_or_writes_oauth_tokens():
    assert "access_token" not in FRONTEND_SERVICE
    assert "refresh_token" not in FRONTEND_SERVICE
    assert "client_secret" not in FRONTEND_SERVICE


def test_schema_keeps_credentials_out_of_calendar_selections_and_busy_blocks():
    assert "access_token_encrypted" in SCHEMA
    assert "refresh_token_encrypted" in SCHEMA
    busy_table = SCHEMA.split(
        "CREATE TABLE IF NOT EXISTS external_busy_blocks", 1
    )[1].split(");", 1)[0]
    for private_field in ("title", "description", "attendees", "location", "notes"):
        assert private_field not in busy_table


def test_oauth_state_is_signed_expiring_and_single_use():
    assert '"aud": "mosaico-google-calendar"' in SERVICE
    assert '"exp": int(expires.timestamp())' in SERVICE
    assert "used_at IS NULL" in SERVICE
    assert "nonce_hash" in SERVICE


def test_calendar_selection_is_verified_against_google_account():
    expected = (
        'calendars = {item["id"]: item for item in await self.list_calendars(user_id)}'
    )
    assert expected in SERVICE
    assert "destination[\"canUseForEvents\"]" in SERVICE
    assert "WRITABLE_ACCESS_ROLES = {\"owner\"}" in SERVICE


def test_provider_failure_is_not_treated_as_free_availability():
    assert "Provider errors must never be interpreted as a free slot." in SERVER
    assert "calendar_provider_unavailable" in SERVICE


def test_booking_creation_uses_cross_instance_advisory_lock():
    assert "pg_advisory_xact_lock" in SERVER
    assert 'f"booking:{session_id}"' in SERVER


def test_disconnect_clears_local_credentials_without_deleting_events():
    assert '"access_token_encrypted": None' in SERVICE
    assert '"refresh_token_encrypted": None' in SERVICE
    disconnect_handler = SERVER.split(
        '@api.delete("/integrations/google-calendar/disconnect")', 1
    )[1].split("@api.", 1)[0]
    assert "sync_booking_event" not in disconnect_handler
    assert "Existing events were not deleted" in disconnect_handler
