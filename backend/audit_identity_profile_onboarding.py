"""Read-only aggregate audit before migration 005.

This script never prints email addresses, names, provider IDs, or profile data.
"""
from __future__ import annotations

import asyncio
import json
import os
import ssl

import asyncpg
from dotenv import load_dotenv
from pathlib import Path


QUERIES = {
    "users": "SELECT count(*) FROM users",
    "duplicate_normalized_emails": """
        SELECT count(*) FROM (
            SELECT lower(trim(email)) FROM users
            WHERE NULLIF(trim(email), '') IS NOT NULL
            GROUP BY lower(trim(email)) HAVING count(*) > 1
        ) duplicates
    """,
    "users_without_active_role": """
        SELECT count(*) FROM users u WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = u.user_id AND ur.active = TRUE
              AND COALESCE(ur.status, 'active') = 'active'
        )
    """,
    "orphan_user_profiles": """
        SELECT count(*) FROM user_profiles p
        LEFT JOIN users u ON u.user_id = p.user_id WHERE u.user_id IS NULL
    """,
    "users_without_common_profile": """
        SELECT count(*) FROM users u
        WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.user_id)
    """,
    "duplicate_common_profiles": """
        SELECT count(*) FROM (
            SELECT user_id FROM user_profiles GROUP BY user_id HAVING count(*) > 1
        ) duplicates
    """,
    "duplicate_role_profiles": """
        SELECT count(*) FROM (
            SELECT user_id, role_code FROM user_role_profiles
            GROUP BY user_id, role_code HAVING count(*) > 1
        ) duplicates
    """,
    "legacy_role_mismatches": """
        SELECT count(*) FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = u.user_id AND ur.role_name = u.role
              AND ur.active = TRUE AND COALESCE(ur.status, 'active') = 'active'
        )
    """,
    "teachers_without_profile": """
        SELECT count(*) FROM user_roles ur
        WHERE ur.role_name = 'profesor' AND ur.active = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM teacher_profiles tp WHERE tp.user_id = ur.user_id
          )
    """,
}


async def main() -> None:
    load_dotenv(Path(__file__).parent / ".env")
    dsn = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL or SUPABASE_DB_URL is required")
    ssl_mode = os.environ.get("DATABASE_SSL", "").lower()
    ssl_value = ssl.create_default_context() if ssl_mode in {"verify-full", "verify-ca"} else (
        "require" if "supabase.co" in dsn or ssl_mode in {"1", "true", "require"} else None
    )
    pool = await asyncpg.create_pool(dsn, min_size=1, max_size=1, ssl=ssl_value)
    try:
        async with pool.acquire() as conn:
            result = {name: int(await conn.fetchval(sql)) for name, sql in QUERIES.items()}
        result["migration_decision"] = (
            "review_required"
            if result["duplicate_normalized_emails"] or result["duplicate_common_profiles"]
            or result["duplicate_role_profiles"] or result["orphan_user_profiles"]
            else "additive_migration_safe"
        )
        result["backfill"] = "No automatic personal, school, role, approval, or onboarding backfill."
        print(json.dumps(result, indent=2, sort_keys=True))
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
