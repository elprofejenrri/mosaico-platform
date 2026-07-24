"""Canonical RBAC policy for MOSAICO.

This module is deliberately framework-free.  It is the single source of truth
for stable role codes, permission metadata, default grants, and scope
evaluation.  Database and FastAPI integration live in ``server.py``.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Optional

SCOPES = {"self", "linked", "assigned", "school", "multi_school", "global"}

ROLE_DEFINITIONS = {
    "administrador_sitio": {
        "code": "ADMIN", "name": "Admón", "description": "Administrador global de MOSAICO.",
        "level": 100, "scope_type": "global", "is_protected": True,
    },
    "alumno": {
        "code": "STUDENT", "name": "Estudiante", "description": "Estudiante de MOSAICO.",
        "level": 10, "scope_type": "self", "is_protected": True,
    },
    "tutor_padre": {
        "code": "STUDENT_TUTOR", "name": "Estudiante Tutor", "description": "Tutor de estudiantes vinculados.",
        "level": 20, "scope_type": "linked", "is_protected": True,
    },
    "profesor": {
        "code": "TEACHER", "name": "Profesor", "description": "Profesor con acceso a recursos asignados.",
        "level": 30, "scope_type": "assigned", "is_protected": True,
    },
    "administrador_escolar": {
        "code": "SCHOOL_ADMIN", "name": "Administrador Escolar", "description": "Operación limitada a escuelas asignadas.",
        "level": 65, "scope_type": "school", "is_protected": True,
    },
    "finanzas": {
        "code": "FINANCE", "name": "Finanzas", "description": "Operación financiera para escuelas asignadas.",
        "level": 55, "scope_type": "multi_school", "is_protected": True,
    },
}


def _permission(code: str, description: str = "") -> dict:
    parts = code.split(".")
    if len(parts) == 2:
        category, action = parts
        resource = category
    else:
        category, resource, action = (parts + ["general", "view"])[:3]
    return {
        "name": code,
        "code": code,
        "label": code,
        "description": description or code.replace(".", " ").replace("_", " ").title(),
        "catalog": category,
        "module": category,
        "section": resource,
        "feature": resource,
        "action": action,
        "risk_level": (
            "critical" if action in {"delete", "refund", "assign", "manage"}
            else "high" if action in {"create", "update", "adjust", "confirm", "reject", "export"}
            else "low"
        ),
        "level": (
            5 if action in {"delete", "refund", "assign", "manage"}
            else 4 if action in {"create", "update", "adjust", "confirm", "reject", "export"}
            else 1
        ),
    }


PERMISSION_CODES = [
    "dashboard.personal.view", "dashboard.executive.view",
    "users.view", "users.create", "users.update", "users.activate", "users.suspend", "users.assign_role",
    "students.view", "students.view_profile", "students.update_profile", "students.view_progress", "students.assign_teacher",
    "tutors.view", "tutors.create", "tutors.update", "tutors.link_student",
    "teachers.view", "teachers.create", "teachers.update", "teachers.assign_student",
    "schedules.view", "schedules.create", "schedules.update", "schedules.block",
    "bookings.view", "bookings.create", "bookings.cancel", "bookings.reschedule",
    "classes.view", "classes.start", "classes.record_attendance", "classes.record_progress",
    "classes.add_observation", "classes.finish",
    "academic_content.view", "academic_content.create", "academic_content.update", "academic_content.delete",
    "credits.view_balance", "credits.view_movements", "credits.purchase", "credits.add", "credits.remove", "credits.adjust",
    "payments.view", "payments.create", "payments.confirm", "payments.reject", "payments.refund",
    "reports.academic.view", "reports.academic.export", "reports.financial.view", "reports.financial.export",
    "settings.general.view", "settings.general.update", "settings.catalogs.manage", "settings.integrations.manage",
    "roles.view", "roles.create", "roles.update", "roles.delete", "roles.assign", "permissions.manage",
    "audit.view", "audit.export",
]

PERMISSIONS = [_permission(code) for code in PERMISSION_CODES]


def _grants(scope: str, *permissions: str) -> dict[str, str]:
    return {permission: scope for permission in permissions}


ROLE_GRANTS: dict[str, dict[str, str]] = {
    "administrador_sitio": {"*": "global", **{code: "global" for code in PERMISSION_CODES}},
    "alumno": {
        **_grants("self", "dashboard.personal.view", "users.view", "users.update", "students.view",
                  "students.view_profile", "students.update_profile", "students.view_progress",
                  "schedules.view", "bookings.view", "bookings.create", "bookings.cancel",
                  "bookings.reschedule", "classes.view", "academic_content.view",
                  "credits.view_balance", "credits.view_movements", "credits.purchase",
                  "payments.view", "reports.academic.view"),
    },
    "tutor_padre": {
        **_grants("self", "dashboard.personal.view", "users.update"),
        **_grants("linked", "users.view", "students.view", "students.view_profile",
                  "students.update_profile", "students.view_progress", "teachers.view",
                  "schedules.view", "bookings.view", "bookings.create", "bookings.cancel",
                  "bookings.reschedule", "classes.view", "academic_content.view",
                  "credits.view_balance", "credits.view_movements", "credits.purchase",
                  "payments.view", "reports.academic.view"),
    },
    "profesor": {
        **_grants("self", "dashboard.personal.view", "users.view", "users.update", "teachers.view",
                  "teachers.update", "schedules.view", "schedules.create", "schedules.update", "schedules.block"),
        **_grants("assigned", "students.view", "students.view_profile", "students.view_progress",
                  "bookings.view", "classes.view", "classes.start", "classes.record_attendance",
                  "classes.record_progress", "classes.add_observation", "classes.finish",
                  "academic_content.view", "reports.academic.view"),
    },
    "administrador_escolar": {
        **_grants("school", "dashboard.personal.view", "dashboard.executive.view", "users.view", "users.create",
                  "users.update", "users.activate", "users.suspend", "students.view", "students.view_profile",
                  "students.update_profile", "students.view_progress", "students.assign_teacher",
                  "tutors.view", "tutors.create", "tutors.update", "tutors.link_student",
                  "teachers.view", "teachers.create", "teachers.update", "teachers.assign_student",
                  "schedules.view", "schedules.create", "schedules.update", "schedules.block",
                  "bookings.view", "bookings.create", "bookings.cancel", "bookings.reschedule",
                  "classes.view", "classes.start", "classes.record_attendance", "classes.record_progress",
                  "classes.add_observation", "classes.finish", "academic_content.view",
                  "academic_content.create", "academic_content.update", "academic_content.delete",
                  "credits.view_balance", "credits.view_movements", "payments.view",
                  "reports.academic.view", "reports.academic.export", "reports.financial.view",
                  "settings.general.view", "settings.general.update", "settings.catalogs.manage",
                  "roles.view", "roles.assign", "audit.view"),
    },
    "finanzas": {
        **_grants("multi_school", "dashboard.personal.view", "dashboard.executive.view", "users.view",
                  "students.view", "students.view_profile", "bookings.view", "classes.view",
                  "credits.view_balance", "credits.view_movements", "credits.add", "credits.remove",
                  "credits.adjust", "payments.view", "payments.create", "payments.confirm",
                  "payments.reject", "payments.refund", "reports.financial.view",
                  "reports.financial.export", "audit.view", "audit.export"),
    },
}


@dataclass(frozen=True)
class ScopeContext:
    actor_user_id: str
    resource_owner_id: Optional[str] = None
    school_id: Optional[str] = None
    authorized_school_ids: frozenset[str] = frozenset()
    linked: bool = False
    assigned: bool = False


def scope_allows(scope: str, context: ScopeContext) -> bool:
    """Evaluate only verified context; callers must derive it from the DB."""
    if scope not in SCOPES:
        return False
    if scope == "global":
        return True
    if scope == "self":
        return bool(context.resource_owner_id) and context.resource_owner_id == context.actor_user_id
    if scope == "linked":
        return context.linked
    if scope == "assigned":
        return context.assigned
    if scope in {"school", "multi_school"}:
        return bool(context.school_id) and context.school_id in context.authorized_school_ids
    return False


def permission_allows(
    grants: Mapping[str, Iterable[str] | str],
    permission_code: str,
    context: ScopeContext,
) -> bool:
    scopes = grants.get(permission_code, ())
    wildcard = grants.get("*", ())
    if isinstance(scopes, str):
        scopes = (scopes,)
    if isinstance(wildcard, str):
        wildcard = (wildcard,)
    return any(scope_allows(scope, context) for scope in (*wildcard, *scopes))
