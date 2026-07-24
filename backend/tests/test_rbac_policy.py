import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rbac_policy import ROLE_DEFINITIONS, ROLE_GRANTS, ScopeContext, permission_allows, scope_allows  # noqa: E402


def context(**overrides):
    base = {
        "actor_user_id": "actor",
        "resource_owner_id": "owner",
        "school_id": "school-a",
        "authorized_school_ids": frozenset({"school-a"}),
        "linked": False,
        "assigned": False,
    }
    base.update(overrides)
    return ScopeContext(**base)


def test_six_required_roles_have_stable_codes():
    assert {role["code"] for role in ROLE_DEFINITIONS.values()} == {
        "ADMIN", "STUDENT", "STUDENT_TUTOR", "TEACHER", "SCHOOL_ADMIN", "FINANCE",
    }


def test_global_scope():
    assert scope_allows("global", context())


def test_self_scope_allows_owner_only():
    assert scope_allows("self", context(resource_owner_id="actor"))
    assert not scope_allows("self", context(resource_owner_id="someone-else"))


def test_linked_scope_requires_verified_relationship():
    assert scope_allows("linked", context(linked=True))
    assert not scope_allows("linked", context(linked=False))


def test_assigned_scope_requires_verified_assignment():
    assert scope_allows("assigned", context(assigned=True))
    assert not scope_allows("assigned", context(assigned=False))


def test_school_scope_rejects_other_school():
    assert scope_allows("school", context())
    assert not scope_allows("school", context(school_id="school-b"))


def test_multi_school_scope():
    ctx = context(school_id="school-b", authorized_school_ids=frozenset({"school-a", "school-b"}))
    assert scope_allows("multi_school", ctx)


def test_unknown_scope_denies_by_default():
    assert not scope_allows("anything", context())


def test_missing_permission_denies_by_default():
    assert not permission_allows({}, "payments.refund", context())


def test_wildcard_still_obeys_its_scope():
    assert permission_allows({"*": "global"}, "payments.refund", context())
    assert not permission_allows({"*": "school"}, "payments.refund", context(school_id="school-b"))


def test_student_cannot_adjust_credits():
    assert not permission_allows(ROLE_GRANTS["alumno"], "credits.adjust", context(resource_owner_id="actor"))


def test_teacher_cannot_view_payments():
    assert not permission_allows(ROLE_GRANTS["profesor"], "payments.view", context(assigned=True))


def test_tutor_cannot_access_unlinked_student():
    assert not permission_allows(ROLE_GRANTS["tutor_padre"], "students.view_profile", context(linked=False))
    assert permission_allows(ROLE_GRANTS["tutor_padre"], "students.view_profile", context(linked=True))


def test_school_admin_cannot_access_other_school():
    assert not permission_allows(
        ROLE_GRANTS["administrador_escolar"], "users.view", context(school_id="school-b")
    )


def test_finance_cannot_edit_academic_progress():
    assert not permission_allows(
        ROLE_GRANTS["finanzas"], "classes.record_progress", context()
    )
