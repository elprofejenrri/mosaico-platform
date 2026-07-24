import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from profile_policy import (  # noqa: E402
    ProfileValidationError,
    canonical_profile_role,
    profile_completion,
    safe_audit_fields,
    validate_common_profile,
    validate_role_profile,
)


def test_profile_role_aliases_are_canonical():
    assert canonical_profile_role("student") == "alumno"
    assert canonical_profile_role("school_admin") == "administrador_escolar"
    assert canonical_profile_role("technical_admin") == "administrador_profesor"


def test_common_profile_is_normalized_and_rejects_unknown_fields():
    result = validate_common_profile({
        "first_name": "  Ana ",
        "country": "mx",
        "timezone": "America/Cancun",
        "native_language": "es-MX",
        "preferences": {"theme": "dark", "email_notifications": True},
    })
    assert result["first_name"] == "Ana"
    assert result["country"] == "MX"
    assert result["native_language"] == "es-mx"
    with pytest.raises(ProfileValidationError):
        validate_common_profile({"role": "administrador_sitio"})


def test_common_profile_validates_phone_and_timezone():
    with pytest.raises(ProfileValidationError):
        validate_common_profile({"phone": "<script>"})
    with pytest.raises(ProfileValidationError):
        validate_common_profile({"timezone": "Moon/Sea_of_Tranquility"})


def test_teacher_cannot_change_approval_through_self_profile():
    with pytest.raises(ProfileValidationError):
        validate_role_profile("profesor", {"approval_status": "approved"})


def test_role_profile_rejects_fields_from_another_persona():
    with pytest.raises(ProfileValidationError):
        validate_role_profile("finanzas", {"learning_goal": "B2"})


def test_completion_reports_next_missing_field():
    completion = profile_completion(
        {
            "first_name": "Ana",
            "last_name": "Gomez",
            "public_name": "Ana",
            "country": "MX",
            "timezone": "America/Cancun",
        },
        {"current_level": "A2", "learning_goal": ""},
        "alumno",
    )
    assert completion["status"] == "incomplete"
    assert completion["nextStep"] == "Complete learning goal"
    assert completion["missingFields"] == ["learning_goal"]


def test_audit_helper_returns_names_not_values():
    assert safe_audit_fields({"phone", "country", "password"}) == ["country", "phone"]
