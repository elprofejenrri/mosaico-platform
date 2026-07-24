import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from identity_onboarding import (  # noqa: E402
    IdentityValidationError,
    completion_for,
    initial_role_for_public_registration,
    normalize_email,
    onboarding_snapshot,
    validate_onboarding_progress,
)


def test_email_is_normalized_and_validated():
    assert normalize_email("  Ana@Example.COM ") == "ana@example.com"
    with pytest.raises(IdentityValidationError):
        normalize_email("not-an-email")


def test_public_registration_allows_only_student_and_teacher():
    assert initial_role_for_public_registration("student") == "alumno"
    assert initial_role_for_public_registration("client") == "alumno"
    assert initial_role_for_public_registration("teacher") == "profesor"
    for role in ("administrador_sitio", "administrador_escolar", "finanzas", "tutor_padre"):
        with pytest.raises(IdentityValidationError):
            initial_role_for_public_registration(role)


def test_student_and_teacher_completion_are_distinct():
    common = {
        "first_name": "Ana", "last_name": "Diaz", "country_code": "MX",
        "timezone": "America/Cancun", "preferred_language": "es",
    }
    student = {
        "native_language": "en", "learning_language": "es",
        "self_reported_level": "A2", "learning_goal": "Travel",
        "preferred_class_format": "online", "general_availability": "Evenings",
    }
    assert completion_for(common, student, "alumno") == {
        "percentage": 100, "complete": True, "missingFields": [],
    }
    teacher = completion_for(common, {}, "profesor")
    assert not teacher["complete"]
    assert "professional_bio" in teacher["missingFields"]


def test_onboarding_progress_rejects_protected_or_terminal_state_changes():
    result = validate_onboarding_progress({
        "currentStep": "professional-profile",
        "completedSteps": ["identity", "identity"],
        "status": "in_progress",
    }, "teacher")
    assert result["completed_steps"] == ["identity"]
    with pytest.raises(IdentityValidationError):
        validate_onboarding_progress({"status": "completed"}, "teacher")
    with pytest.raises(IdentityValidationError):
        validate_onboarding_progress({"school_id": "forged"}, "student")


def test_invalid_persisted_state_fails_safe_to_review():
    snapshot = onboarding_snapshot({
        "onboarding_type": "student", "version": 1, "status": "unexpected",
    }, ["country_code"])
    assert snapshot["status"] == "requires_review"
    assert snapshot["canContinue"]
