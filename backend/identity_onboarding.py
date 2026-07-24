"""Domain rules for MOSAICO identity, profile completion, and onboarding.

This module is intentionally independent from FastAPI and the database adapter
so the security-critical state rules can be unit tested in isolation.
"""
from __future__ import annotations

import re
from typing import Any, Mapping


PUBLIC_ROLE_BY_PROFILE_TYPE = {
    "client": "alumno",
    "student": "alumno",
    "teacher": "profesor",
}
PRIVILEGED_PUBLIC_ROLES = {
    "administrador_sitio",
    "administrador_profesor",
    "administrador_escolar",
    "finanzas",
    "coordinador",
    "editor_cms",
    "viewer",
    "tutor_padre",
}
USER_STATUSES = {"pending_profile", "pending_approval", "active", "suspended", "inactive"}
ONBOARDING_STATUSES = {
    "not_started", "in_progress", "completed", "blocked", "requires_review",
}
TEACHER_APPROVAL_STATUSES = {
    "incomplete", "pending", "approved", "rejected", "suspended",
}
ONBOARDING_TYPES = {"student", "teacher"}
ONBOARDING_VERSION = 1

COMMON_REQUIRED = (
    "first_name", "last_name", "country_code", "timezone", "preferred_language",
)
STUDENT_REQUIRED = (
    "native_language", "learning_language", "self_reported_level",
    "learning_goal", "preferred_class_format", "general_availability",
)
TEACHER_REQUIRED = (
    "professional_bio", "languages_taught", "teaching_modalities",
    "experience_summary",
)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class IdentityValidationError(ValueError):
    """A safe domain-validation failure."""


def normalize_email(value: Any) -> str:
    if not isinstance(value, str):
        raise IdentityValidationError("email must be text")
    normalized = value.strip().casefold()
    if len(normalized) > 254 or not _EMAIL_RE.match(normalized):
        raise IdentityValidationError("Valid email is required")
    return normalized


def initial_role_for_public_registration(profile_type: Any) -> str:
    normalized = str(profile_type or "student").strip().lower()
    if normalized in PRIVILEGED_PUBLIC_ROLES:
        raise IdentityValidationError("The requested account type is not available for public registration")
    role = PUBLIC_ROLE_BY_PROFILE_TYPE.get(normalized)
    if not role:
        raise IdentityValidationError("profile_type must be student or teacher")
    return role


def onboarding_type_for_role(role: str) -> str:
    if role == "alumno":
        return "student"
    if role == "profesor":
        return "teacher"
    raise IdentityValidationError("This role does not support public onboarding")


def _present(value: Any) -> bool:
    return value not in (None, "", [], {})


def completion_for(
    common: Mapping[str, Any],
    specialized: Mapping[str, Any],
    role: str,
) -> dict:
    required = list(COMMON_REQUIRED)
    role_required = STUDENT_REQUIRED if role == "alumno" else TEACHER_REQUIRED if role == "profesor" else ()
    required.extend(role_required)
    missing = [
        field for field in required
        if not _present(common.get(field) if field in COMMON_REQUIRED else specialized.get(field))
    ]
    percentage = round(((len(required) - len(missing)) / len(required)) * 100) if required else 100
    return {
        "percentage": percentage,
        "complete": not missing,
        "missingFields": missing,
    }


def onboarding_snapshot(
    record: Mapping[str, Any],
    missing_fields: list[str],
) -> dict:
    status = str(record.get("status") or "not_started")
    if status not in ONBOARDING_STATUSES:
        status = "requires_review"
    completed_steps = list(record.get("completed_steps") or [])
    can_continue = status in {"not_started", "in_progress", "requires_review"}
    blocked_reason = record.get("blocked_reason") if status == "blocked" else None
    return {
        "type": record.get("onboarding_type"),
        "version": int(record.get("version") or ONBOARDING_VERSION),
        "status": status,
        "currentStep": record.get("current_step") or "profile",
        "completedSteps": completed_steps,
        "missingFields": missing_fields,
        "nextStep": None if status == "completed" else (record.get("current_step") or "profile"),
        "canContinue": can_continue,
        "blockedReason": blocked_reason,
        "startedAt": record.get("started_at"),
        "lastSavedAt": record.get("last_saved_at"),
        "completedAt": record.get("completed_at"),
    }


def validate_onboarding_progress(payload: Mapping[str, Any], expected_type: str) -> dict:
    allowed = {"currentStep", "completedSteps", "status"}
    unknown = set(payload) - allowed
    if unknown:
        raise IdentityValidationError(
            f"Unsupported onboarding fields: {', '.join(sorted(unknown))}"
        )
    status = str(payload.get("status") or "in_progress").strip().lower()
    if status not in {"in_progress", "requires_review"}:
        raise IdentityValidationError("Onboarding progress can only be in_progress or requires_review")
    current_step = str(payload.get("currentStep") or "profile").strip()
    if not current_step or len(current_step) > 80:
        raise IdentityValidationError("currentStep is invalid")
    steps = payload.get("completedSteps") or []
    if not isinstance(steps, list) or len(steps) > 30:
        raise IdentityValidationError("completedSteps must be a list with at most 30 items")
    cleaned = []
    for step in steps:
        value = str(step).strip()
        if not value or len(value) > 80:
            raise IdentityValidationError("completedSteps contains an invalid step")
        if value not in cleaned:
            cleaned.append(value)
    if expected_type not in ONBOARDING_TYPES:
        raise IdentityValidationError("Invalid onboarding type")
    return {"status": status, "current_step": current_step, "completed_steps": cleaned}
