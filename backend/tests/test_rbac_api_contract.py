import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import server  # noqa: E402
from database import TABLE_COLUMNS  # noqa: E402


def route(method, path):
    return next(
        item for item in server.api.routes
        if item.path == path and method in item.methods
    )


def dependency_names(item):
    return {dependency.call.__name__ for dependency in item.dependant.dependencies}


def test_permission_inspection_routes_exist():
    assert route("GET", "/api/auth/me/permissions")
    assert route("GET", "/api/admin/users/{user_id}/effective-permissions")


def test_payment_status_requires_authentication_dependency():
    item = route("GET", "/api/payments/status/{session_id}")
    assert "get_current_user" in dependency_names(item)


def test_financial_mutations_require_authentication_dependency():
    payment = route("PATCH", "/api/finance/payments/{session_id}/{action}")
    credits = route("POST", "/api/finance/credits/{account_user_id}/movements")
    assert "get_current_user" in dependency_names(payment)
    assert "get_current_user" in dependency_names(credits)


def test_rbac_tables_are_registered_in_database_adapter():
    for table in (
        "schools", "user_school_memberships", "tutor_student_links",
        "teacher_student_assignments", "credit_movements",
    ):
        assert table in TABLE_COLUMNS


def test_profile_routes_and_storage_tables_are_registered():
    assert route("GET", "/api/profile")
    assert route("PATCH", "/api/profile")
    assert route("POST", "/api/profile/photo")
    assert route("PATCH", "/api/admin/profiles/{user_id}/teacher-approval")
    assert {"user_profiles", "user_role_profiles"}.issubset(TABLE_COLUMNS)
    assert "preferences" in TABLE_COLUMNS["user_profiles"]
    assert "profile_data" in TABLE_COLUMNS["user_role_profiles"]


def test_identity_and_onboarding_contracts_are_registered():
    assert route("GET", "/api/auth/me/onboarding")
    assert route("PATCH", "/api/auth/me/onboarding")
    assert route("POST", "/api/auth/me/onboarding/complete")
    assert route("GET", "/api/admin/users/{user_id}/onboarding")
    assert {"auth_identities", "tutor_profiles", "onboarding_states"}.issubset(TABLE_COLUMNS)
    assert {"provider", "provider_user_id", "email_normalized"}.issubset(
        TABLE_COLUMNS["auth_identities"]
    )
    assert {"status", "current_step", "completed_steps"}.issubset(
        TABLE_COLUMNS["onboarding_states"]
    )


def test_role_assignment_supports_school_and_expiry():
    assert {"school_id", "status", "assigned_at", "expires_at"}.issubset(TABLE_COLUMNS["user_roles"])


def test_role_assignment_accepts_canonical_and_compatibility_permissions(monkeypatch):
    async def permission_scopes(_, permission_code):
        return {
            "users.roles.assign": {"global"},
            "roles.assign": {"school"},
        }[permission_code]

    monkeypatch.setattr(server, "_permission_scopes", permission_scopes)
    assert asyncio.run(server._role_assignment_scopes(object())) == {"global", "school"}


def test_audit_contract_captures_authorization_decision():
    assert {
        "school_id", "permission_code", "result", "denial_reason", "request_id",
    }.issubset(TABLE_COLUMNS["audit_events"])


def test_static_permission_route_is_not_shadowed_by_role_detail():
    paths = [item.path for item in server.api.routes if "GET" in item.methods]
    assert paths.index("/api/admin/rbac/permissions") < len(paths)
    assert "/api/admin/rbac/roles/{role_name}/detail" in paths
