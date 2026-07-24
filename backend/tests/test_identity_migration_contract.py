from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATION = (ROOT / "migrations" / "005_identity_profile_onboarding.sql").read_text(encoding="utf-8")
SCHEMA = (ROOT / "schema.sql").read_text(encoding="utf-8")


def test_migration_is_additive_transactional_and_idempotent():
    assert MIGRATION.lstrip().startswith("BEGIN;")
    assert MIGRATION.rstrip().endswith("COMMIT;")
    assert "DROP TABLE" not in MIGRATION.upper()
    assert "DROP COLUMN" not in MIGRATION.upper()
    assert "CREATE TABLE IF NOT EXISTS auth_identities" in MIGRATION
    assert "CREATE TABLE IF NOT EXISTS onboarding_states" in MIGRATION
    assert "ADD COLUMN IF NOT EXISTS" in MIGRATION


def test_schema_and_migration_define_same_new_core_tables():
    for table in ("auth_identities", "tutor_profiles", "onboarding_states"):
        marker = f"CREATE TABLE IF NOT EXISTS {table}"
        assert marker in MIGRATION
        assert marker in SCHEMA


def test_migration_does_not_infer_school_role_or_approval_data():
    assert "INSERT INTO schools" not in MIGRATION
    assert "INSERT INTO user_roles" not in MIGRATION
    assert "UPDATE teacher_profiles SET approval_status = 'approved'" not in MIGRATION
    assert "INSERT INTO onboarding_states" not in MIGRATION


def test_constraints_cover_bounded_states_without_validating_legacy_rows():
    assert "ck_users_account_status" in MIGRATION
    assert "ck_teacher_approval_status" in MIGRATION
    assert "ck_onboarding_status" in MIGRATION
    assert "NOT VALID" in MIGRATION
