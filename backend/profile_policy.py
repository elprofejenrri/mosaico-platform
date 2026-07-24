"""Validation and presentation policy for MOSAICO user profiles.

The module is framework-free so profile contracts can be tested without a
database or HTTP server. Identity and authorization remain in ``server.py``.
"""
from __future__ import annotations

import re
from typing import Any, Mapping
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


PROFILE_ROLE_ALIASES = {
    "student": "alumno",
    "tutor": "tutor_padre",
    "parent": "tutor_padre",
    "teacher": "profesor",
    "school_admin": "administrador_escolar",
    "finance": "finanzas",
    "technical_admin": "administrador_profesor",
    "admin": "administrador_sitio",
}

PROFILE_ROLE_LABELS = {
    "alumno": "Student",
    "tutor_padre": "Tutor / Parent",
    "profesor": "Teacher",
    "administrador_escolar": "School Administrator",
    "finanzas": "Finance",
    "administrador_profesor": "Technical Admin",
    "administrador_sitio": "Technical Admin",
}

COMMON_FIELDS = {
    "first_name", "last_name", "public_name", "picture", "native_language",
    "learning_language", "country", "timezone", "phone", "preferences",
}

ROLE_FIELDS = {
    "alumno": {
        "current_level", "learning_goal", "preferred_class_types",
        "general_availability",
    },
    "profesor": {
        "biography", "teaching_languages", "specialties", "authorized_levels",
        "certifications", "modalities", "intro_video_url",
    },
    "tutor_padre": {"relationship_summary"},
    "administrador_escolar": {
        "institution_name", "job_title", "contact_email", "contact_phone",
    },
    "finanzas": {"job_title"},
    "administrador_profesor": {"technical_role"},
    "administrador_sitio": {"technical_role"},
}

LIST_FIELDS = {
    "preferred_class_types", "teaching_languages", "specialties",
    "authorized_levels", "certifications", "modalities",
}

COMMON_REQUIRED = ("first_name", "last_name", "public_name", "country", "timezone")
ROLE_REQUIRED = {
    "alumno": ("current_level", "learning_goal"),
    "profesor": ("biography", "teaching_languages", "specialties", "modalities"),
    "tutor_padre": (),
    "administrador_escolar": ("institution_name", "job_title"),
    "finanzas": ("job_title",),
    "administrador_profesor": ("technical_role",),
    "administrador_sitio": ("technical_role",),
}

PREFERENCE_FIELDS = {
    "interface_language", "theme", "email_notifications",
    "learning_reminders", "reduced_motion", "high_contrast",
}
ALLOWED_THEMES = {"system", "light", "dark"}
APPROVAL_STATUSES = {"pending", "approved", "suspended"}
_LANGUAGE_RE = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$")
_PHONE_RE = re.compile(r"^[+()0-9.\-\s]{7,30}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ProfileValidationError(ValueError):
    pass


def canonical_profile_role(role: str) -> str:
    normalized = str(role or "").strip().lower()
    return PROFILE_ROLE_ALIASES.get(normalized, normalized)


def _text(value: Any, field: str, maximum: int, *, multiline: bool = False) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ProfileValidationError(f"{field} must be text")
    value = value.strip()
    if len(value) > maximum:
        raise ProfileValidationError(f"{field} must be {maximum} characters or fewer")
    if not multiline and ("\n" in value or "\r" in value):
        raise ProfileValidationError(f"{field} must be a single line")
    return value


def _url(value: Any, field: str) -> str:
    value = _text(value, field, 2048)
    if not value:
        return ""
    parsed = urlparse(value)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ProfileValidationError(f"{field} must be a valid http(s) URL")
    return value


def _list(value: Any, field: str) -> list[str]:
    if value in (None, ""):
        return []
    if not isinstance(value, list) or len(value) > 30:
        raise ProfileValidationError(f"{field} must be a list with at most 30 items")
    cleaned = []
    for item in value:
        text = _text(item, field, 120)
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def validate_common_profile(payload: Mapping[str, Any]) -> dict:
    unknown = set(payload) - COMMON_FIELDS
    if unknown:
        raise ProfileValidationError(f"Unsupported profile fields: {', '.join(sorted(unknown))}")
    output: dict[str, Any] = {}
    for field in ("first_name", "last_name", "public_name"):
        if field in payload:
            output[field] = _text(payload[field], field, 120)
    if "picture" in payload:
        output["picture"] = _url(payload["picture"], "picture")
    for field in ("native_language", "learning_language"):
        if field in payload:
            value = _text(payload[field], field, 20)
            if value and not _LANGUAGE_RE.match(value):
                raise ProfileValidationError(f"{field} must be a valid language code")
            output[field] = value.lower()
    if "country" in payload:
        country = _text(payload["country"], "country", 2).upper()
        if country and (len(country) != 2 or not country.isalpha()):
            raise ProfileValidationError("country must be a two-letter ISO code")
        output["country"] = country
    if "timezone" in payload:
        timezone = _text(payload["timezone"], "timezone", 80)
        try:
            if timezone:
                ZoneInfo(timezone)
        except ZoneInfoNotFoundError as exc:
            raise ProfileValidationError("timezone is not recognized") from exc
        output["timezone"] = timezone
    if "phone" in payload:
        phone = _text(payload["phone"], "phone", 30)
        if phone and not _PHONE_RE.match(phone):
            raise ProfileValidationError("phone contains unsupported characters")
        output["phone"] = phone
    if "preferences" in payload:
        preferences = payload["preferences"]
        if not isinstance(preferences, Mapping):
            raise ProfileValidationError("preferences must be an object")
        unknown_preferences = set(preferences) - PREFERENCE_FIELDS
        if unknown_preferences:
            raise ProfileValidationError(
                f"Unsupported preferences: {', '.join(sorted(unknown_preferences))}"
            )
        validated_preferences = {}
        for key, value in preferences.items():
            if key in {"email_notifications", "learning_reminders", "reduced_motion", "high_contrast"}:
                if not isinstance(value, bool):
                    raise ProfileValidationError(f"{key} must be true or false")
                validated_preferences[key] = value
            elif key == "theme":
                value = _text(value, key, 10).lower()
                if value not in ALLOWED_THEMES:
                    raise ProfileValidationError("theme must be system, light, or dark")
                validated_preferences[key] = value
            else:
                value = _text(value, key, 10).lower()
                if value not in {"en", "es"}:
                    raise ProfileValidationError("interface_language must be en or es")
                validated_preferences[key] = value
        output["preferences"] = validated_preferences
    return output


def validate_role_profile(role: str, payload: Mapping[str, Any]) -> dict:
    role = canonical_profile_role(role)
    allowed = ROLE_FIELDS.get(role)
    if allowed is None:
        raise ProfileValidationError("This role does not have an editable profile")
    unknown = set(payload) - allowed
    if unknown:
        raise ProfileValidationError(
            f"Unsupported {role} profile fields: {', '.join(sorted(unknown))}"
        )
    output: dict[str, Any] = {}
    for field, value in payload.items():
        if field in LIST_FIELDS:
            output[field] = _list(value, field)
        elif field == "intro_video_url":
            output[field] = _url(value, field)
        elif field == "contact_email":
            value = _text(value, field, 254)
            if value and not _EMAIL_RE.match(value):
                raise ProfileValidationError("contact_email is not valid")
            output[field] = value.lower()
        elif field in {"biography", "learning_goal", "general_availability", "relationship_summary"}:
            output[field] = _text(value, field, 2000, multiline=True)
        elif field == "contact_phone":
            value = _text(value, field, 30)
            if value and not _PHONE_RE.match(value):
                raise ProfileValidationError("contact_phone contains unsupported characters")
            output[field] = value
        else:
            output[field] = _text(value, field, 160)
    return output


def profile_completion(common: Mapping[str, Any], details: Mapping[str, Any], role: str) -> dict:
    role = canonical_profile_role(role)
    required = [("common", field) for field in COMMON_REQUIRED]
    required.extend(("details", field) for field in ROLE_REQUIRED.get(role, ()))
    missing = []
    for location, field in required:
        value = common.get(field) if location == "common" else details.get(field)
        if value in (None, "", []):
            missing.append(field)
    total = len(required)
    completed = total - len(missing)
    percentage = 100 if total == 0 else round((completed / total) * 100)
    if percentage == 100:
        status, next_step = "complete", "Profile is ready"
    elif percentage == 0:
        status, next_step = "onboarding", "Start your profile"
    else:
        status, next_step = "incomplete", f"Complete {missing[0].replace('_', ' ')}"
    return {
        "percentage": percentage,
        "status": status,
        "missingFields": missing,
        "nextStep": next_step,
    }


def safe_audit_fields(fields: set[str]) -> list[str]:
    """Return field names only; profile values must never enter audit metadata."""
    return sorted(field for field in fields if field in COMMON_FIELDS or any(
        field in role_fields for role_fields in ROLE_FIELDS.values()
    ))
