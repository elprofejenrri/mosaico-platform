"""Transactional identity provisioning for verified registration identities."""
from __future__ import annotations

import json
import uuid
from typing import Any

from identity_onboarding import ONBOARDING_VERSION, onboarding_type_for_role


class IdentityConflictError(RuntimeError):
    pass


async def provision_local_identity(
    pool: Any,
    *,
    email: str,
    name: str,
    password_hash: str,
    role: str,
    now: str,
) -> dict:
    """Atomically create the internal user, profiles, role, onboarding, and audit."""
    user_id = f"local-{uuid.uuid4()}"
    provider_identity = user_id
    onboarding_type = onboarding_type_for_role(role)
    account_status = "pending_profile"
    first, _, last = name.strip().partition(" ")
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "SELECT pg_advisory_xact_lock(hashtext($1))",
                f"registration:{email}",
            )
            existing = await conn.fetchrow(
                "SELECT user_id FROM users WHERE email_normalized = $1 OR lower(email) = $1 LIMIT 1",
                email,
            )
            if existing:
                raise IdentityConflictError("Email already exists")
            await conn.execute(
                """INSERT INTO users (
                       user_id, email, email_normalized, name, picture, role,
                       password_hash, auth_provider, auth_provider_user_id,
                       profile_type, active, status, created_at, updated_at, last_login_at
                   ) VALUES ($1,$2,$2,$3,'',$4,$5,'local',$1,$6,TRUE,$7,$8,$8,$8)""",
                user_id, email, name, role, password_hash, onboarding_type,
                account_status, now,
            )
            await conn.execute(
                """INSERT INTO auth_identities (
                       id, user_id, provider, provider_user_id, email_normalized,
                       created_at, updated_at
                   ) VALUES ($1,$2,'local',$2,$3,$4,$4)""",
                f"ai_{uuid.uuid4().hex}", user_id, email, now,
            )
            await conn.execute(
                """INSERT INTO user_profiles (
                       id,user_id,first_name,last_name,public_name,display_name,
                       picture,avatar_url,country, country_code,timezone,
                       preferred_language,phone,preferences,
                       profile_completion_percentage,created_at,updated_at
                   ) VALUES ($1,$2,$3,$4,$5,$5,'','', '', '', 'UTC','en','',
                       $6::jsonb,0,$7,$7)""",
                f"up_{uuid.uuid4().hex}", user_id, first, last, name,
                json.dumps({"interface_language": "en"}), now,
            )
            approval_status = "incomplete" if role == "profesor" else "approved"
            await conn.execute(
                """INSERT INTO user_role_profiles (
                       id,user_id,role_code,profile_data,approval_status,created_at,updated_at
                   ) VALUES ($1,$2,$3,'{}'::jsonb,$4,$5,$5)""",
                f"urp_{uuid.uuid4().hex}", user_id, role, approval_status, now,
            )
            if role == "alumno":
                await conn.execute(
                    """INSERT INTO student_profiles (
                           id,user_id,phone,enrolled_products,notes,status,created_at,updated_at
                       ) VALUES ($1,$2,'','[]'::jsonb,'','activo',$3,$3)""",
                    f"sp_{uuid.uuid4().hex}", user_id, now,
                )
            else:
                await conn.execute(
                    """INSERT INTO teacher_profiles (
                           id,user_id,specialties,assigned_products,approval_status,
                           created_at,updated_at
                       ) VALUES ($1,$2,'[]'::jsonb,'[]'::jsonb,'incomplete',$3,$3)""",
                    f"tp_{uuid.uuid4().hex}", user_id, now,
                )
            await conn.execute(
                """INSERT INTO onboarding_states (
                       id,user_id,onboarding_type,version,status,current_step,
                       completed_steps,created_at,updated_at
                   ) VALUES ($1,$2,$3,$4,'not_started','profile','[]'::jsonb,$5,$5)""",
                f"ob_{uuid.uuid4().hex}", user_id, onboarding_type,
                ONBOARDING_VERSION, now,
            )
            await conn.execute(
                """INSERT INTO user_roles (
                       id,user_id,role_name,active,status,assigned_at,created_at,updated_at
                   ) VALUES ($1,$2,$3,TRUE,'active',$4,$4,$4)""",
                str(uuid.uuid4()), user_id, role, now,
            )
            await conn.execute(
                """INSERT INTO audit_events (
                       id,actor_user_id,target_user_id,event_type,action,entity_type,
                       entity_id,result,metadata,risk_level,created_at
                   ) VALUES ($1,$2,$2,'identity.provisioned','create','user',$2,
                       'allowed',$3::jsonb,'medium',$4)""",
                str(uuid.uuid4()), user_id,
                json.dumps({"provider": "local", "initial_role": role}), now,
            )
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": "",
        "role": role,
        "google_id": None,
        "password_hash": password_hash,
        "auth_provider": "local",
        "auth_provider_user_id": provider_identity,
        "profile_type": onboarding_type,
        "active": True,
        "status": account_status,
        "created_at": now,
        "updated_at": now,
        "last_login_at": now,
    }
