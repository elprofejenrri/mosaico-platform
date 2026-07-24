import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import server  # noqa: E402


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])
        self.inserted = []

    async def find_one(self, query, _projection=None):
        for row in self.rows:
            if all(row.get(key) == value for key, value in query.items()):
                return dict(row)
        return None

    async def insert_one(self, doc):
        self.inserted.append(dict(doc))
        self.rows.append(dict(doc))

    async def update_one(self, query, update):
        for row in self.rows:
            if all(row.get(key) == value for key, value in query.items()):
                row.update(update["$set"])


def test_supabase_callback_recovers_existing_internal_user_by_normalized_email(monkeypatch):
    existing = {
        "user_id": "local-existing", "email": "ana@example.com",
        "email_normalized": "ana@example.com", "name": "Ana",
        "picture": "", "role": "alumno", "auth_provider": "local",
        "profile_type": "student", "active": True, "status": "active",
        "created_at": "2026-07-24T00:00:00+00:00",
    }
    fake_db = SimpleNamespace(
        users=FakeCollection([existing]),
        auth_identities=FakeCollection(),
    )

    async def noop(*_args, **_kwargs):
        return None

    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "_sync_user_role", noop)
    monkeypatch.setattr(server, "_ensure_onboarding_scaffold", noop)
    monkeypatch.setattr(server, "_record_login", noop)
    user = asyncio.run(server._get_or_create_user_from_supabase({
        "sub": "provider-subject",
        "email": "ANA@example.com",
        "user_metadata": {"name": "Ana"},
    }))
    assert user.user_id == "local-existing"
    assert fake_db.users.inserted == []
    assert fake_db.auth_identities.inserted[0]["user_id"] == "local-existing"
    assert fake_db.auth_identities.inserted[0]["provider_user_id"] == "provider-subject"


def test_pending_account_can_only_use_self_profile_permissions(monkeypatch):
    pending = server.User(
        user_id="pending", email="pending@example.com", name="Pending",
        role="alumno", status="pending_profile",
    )

    async def grants(_user):
        return {
            "profiles.view": ["self"],
            "profiles.update": ["self"],
            "bookings.create": ["self"],
        }

    async def schools(_user):
        return []

    monkeypatch.setattr(server, "_effective_permission_grants", grants)
    monkeypatch.setattr(server, "_authorized_school_ids", schools)
    assert asyncio.run(server.can(
        pending, "profiles.update", resource_owner_id=pending.user_id,
    ))
    assert not asyncio.run(server.can(
        pending, "bookings.create", resource_owner_id=pending.user_id,
    ))
