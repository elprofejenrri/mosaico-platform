"""Apply only conservative RBAC repairs; requires the explicit --apply flag."""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone

from database import close_pool, get_database


async def repair(apply: bool) -> int:
    if not apply:
        print("No changes made. Re-run with --apply to disable expired role assignments.")
        return 0
    db = await get_database()
    now = datetime.now(timezone.utc).isoformat()
    rows = await db.user_roles.find({"active": True, "status": "active"}, {"_id": 0}).to_list(10000)
    repaired = 0
    for row in rows:
        expires_at = row.get("expires_at")
        if expires_at and expires_at <= now:
            await db.user_roles.update_one(
                {"id": row["id"]},
                {"$set": {"active": False, "status": "expired", "updated_at": now}},
            )
            repaired += 1
    await close_pool()
    print(f"Disabled {repaired} expired role assignments.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(repair(args.apply)))


if __name__ == "__main__":
    main()
