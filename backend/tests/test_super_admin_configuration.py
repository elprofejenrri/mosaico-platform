import copy
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import server  # noqa: E402


def test_platform_config_defaults_are_valid():
    config = copy.deepcopy(server.DEFAULT_SETTINGS["platform_config"])

    server._validate_platform_config(config)


def test_platform_config_rejects_unknown_default_role():
    config = copy.deepcopy(server.DEFAULT_SETTINGS["platform_config"])
    config["role_defaults"]["new_user_role"] = "root"

    with pytest.raises(HTTPException):
        server._validate_platform_config(config)


def test_platform_config_rejects_invalid_availability_duration():
    config = copy.deepcopy(server.DEFAULT_SETTINGS["platform_config"])
    config["teacher_availability_rules"]["allowed_durations"] = [25, 60]

    with pytest.raises(HTTPException):
        server._validate_platform_config(config)


def test_super_admin_keeps_wildcard_permission():
    assert server.ROLE_PERMISSION_LEVELS["administrador_sitio"]["*"] == 100


def test_analytics_catalog_contains_core_events():
    assert "class_booked" in server.ANALYTICS_EVENT_NAMES
    assert "settings_updated" in server.ANALYTICS_EVENT_NAMES
    assert "role_assigned" in server.ANALYTICS_EVENT_NAMES


def test_error_payload_contract_includes_request_id():
    payload = server._error_payload("forbidden", "No access", "req_test")

    assert payload["code"] == "forbidden"
    assert payload["message"] == "No access"
    assert payload["requestId"] == "req_test"
    assert payload["timestamp"]


def test_atlas_seed_catalog_has_25_volumes():
    assert len(server.ATLAS_VOLUME_SEEDS) == 25
    assert server.ATLAS_VOLUME_SEEDS[0][1] == "Master Index & Decision Log"
    assert server.ATLAS_VOLUME_SEEDS[24][1] == "Future Vision"


def test_atlas_permissions_are_registered():
    names = {item["name"] for item in server.PERMISSION_CATALOG}

    assert "atlas.view" in names
    assert "atlas.manage" in names
    assert "atlas.approve" in names
    assert "atlas.audit.view" in names


def test_atlas_semver_increment_policy():
    assert server._next_semver("1.2.3", "major") == "2.0.0"
    assert server._next_semver("1.2.3", "minor") == "1.3.0"
    assert server._next_semver("1.2.3", "patch") == "1.2.4"
