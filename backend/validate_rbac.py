"""Read-only RBAC integrity validator suitable for local use and CI."""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

import asyncpg
from dotenv import load_dotenv

from rbac_policy import PERMISSION_CODES, ROLE_DEFINITIONS, SCOPES

load_dotenv()


CHECKS = {
    "users_without_roles": """
        SELECT COUNT(*) FROM users u
        WHERE u.active = TRUE AND NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = u.user_id AND ur.active = TRUE AND ur.status = 'active'
        )
    """,
    "roles_without_permissions": """
        SELECT COUNT(*) FROM roles r
        WHERE r.active = TRUE AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_name = r.name AND rp.allowed = TRUE AND rp.level > 0
        )
    """,
    "orphan_user_roles": """
        SELECT COUNT(*) FROM user_roles ur
        LEFT JOIN users u ON u.user_id = ur.user_id
        LEFT JOIN roles r ON r.name = ur.role_name
        WHERE u.user_id IS NULL OR r.name IS NULL
    """,
    "orphan_role_permissions": """
        SELECT COUNT(*) FROM role_permissions rp
        LEFT JOIN roles r ON r.name = rp.role_name
        LEFT JOIN permissions p ON p.name = rp.permission
        WHERE r.name IS NULL OR p.name IS NULL
    """,
    "inactive_users_with_active_roles": """
        SELECT COUNT(*) FROM users u
        JOIN user_roles ur ON ur.user_id = u.user_id
        WHERE (u.active = FALSE OR u.status <> 'active')
          AND ur.active = TRUE AND ur.status = 'active'
    """,
    "invalid_scopes": """
        SELECT COUNT(*) FROM role_permissions
        WHERE scope NOT IN ('self','linked','assigned','school','multi_school','global')
    """,
    "scoped_roles_without_school": """
        SELECT COUNT(*) FROM user_roles ur
        JOIN roles r ON r.name = ur.role_name
        WHERE ur.active = TRUE AND ur.status = 'active'
          AND r.scope_type IN ('school','multi_school') AND ur.school_id IS NULL
    """,
    "financial_records_without_school": """
        SELECT COUNT(*) FROM payment_transactions
        WHERE school_id IS NULL AND payment_status IN ('paid','refunded')
    """,
    "credit_movements_without_actor": """
        SELECT COUNT(*) FROM credit_movements
        WHERE actor_user_id IS NULL OR actor_user_id = ''
    """,
    "audit_without_permission": """
        SELECT COUNT(*) FROM audit_events
        WHERE event_type = 'authorization.denied' AND permission_code IS NULL
    """,
    "duplicate_memberships": """
        SELECT COUNT(*) FROM (
            SELECT user_id, school_id, membership_type, COUNT(*)
            FROM user_school_memberships
            GROUP BY user_id, school_id, membership_type HAVING COUNT(*) > 1
        ) d
    """,
}

CRITICAL = {
    "orphan_user_roles", "orphan_role_permissions", "invalid_scopes",
    "inactive_users_with_active_roles",
}


async def validate() -> int:
    dsn = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        print("ERROR DATABASE_URL or SUPABASE_DB_URL is required", file=sys.stderr)
        return 2
    ssl_arg = "require" if "supabase.co" in dsn or os.environ.get("DATABASE_SSL", "").lower() in {"1", "true", "require"} else None
    conn = await asyncpg.connect(dsn, ssl=ssl_arg)
    errors = []
    warnings = []
    stats = {}
    try:
        try:
            for name, sql in CHECKS.items():
                value = int(await conn.fetchval(sql))
                stats[name] = value
                if value:
                    (errors if name in CRITICAL else warnings).append((name, value))
            for table in ("users", "roles", "permissions", "role_permissions", "user_roles", "schools"):
                stats[f"table.{table}"] = int(await conn.fetchval(f"SELECT COUNT(*) FROM {table}"))
            role_codes = {row["code"] for row in await conn.fetch("SELECT code FROM roles WHERE active = TRUE")}
            missing_roles = {item["code"] for item in ROLE_DEFINITIONS.values()} - role_codes
            if missing_roles:
                errors.append(("missing_base_roles", sorted(missing_roles)))
            permission_codes = {row["name"] for row in await conn.fetch("SELECT name FROM permissions WHERE active = TRUE")}
            missing_permissions = set(PERMISSION_CODES) - permission_codes
            if missing_permissions:
                errors.append(("missing_permissions", sorted(missing_permissions)))
        except (asyncpg.UndefinedColumnError, asyncpg.UndefinedTableError) as exc:
            errors.append(("schema_migration_required", str(exc)))
    finally:
        await conn.close()

    print("MOSAICO RBAC validation")
    for key, value in sorted(stats.items()):
        print(f"STAT {key}={value}")
    for name, value in warnings:
        print(f"WARN {name}={value}")
    for name, value in errors:
        print(f"ERROR {name}={value}")
    print(f"RESULT errors={len(errors)} warnings={len(warnings)} scopes={','.join(sorted(SCOPES))}")
    return 1 if errors else 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    raise SystemExit(asyncio.run(validate()))


if __name__ == "__main__":
    main()
