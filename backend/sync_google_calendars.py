"""Run periodic Google Calendar free/busy synchronization.

Intended for a Render Cron Job. The same backend environment variables and
database are required. Output is aggregate-only and contains no account data.
"""
from __future__ import annotations

import asyncio
import logging

from database import close_pool, get_database
from google_calendar_service import (
    GoogleCalendarConfig,
    GoogleCalendarError,
    GoogleCalendarService,
)


logger = logging.getLogger("mosaico.google_calendar_sync")
logging.basicConfig(level=logging.INFO)


async def run() -> int:
    config = GoogleCalendarConfig.from_env()
    if not config.ready:
        logger.info("Google Calendar periodic sync disabled or not configured")
        return 0
    db = await get_database()
    service = GoogleCalendarService(db, config)
    async with db._pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT DISTINCT connection.*
            FROM external_calendar_connections connection
            JOIN users account ON account.user_id = connection.user_id
            JOIN user_roles role ON role.user_id = connection.user_id
            JOIN user_role_profiles profile
              ON profile.user_id = connection.user_id
             AND profile.role_code = 'profesor'
            WHERE connection.provider = 'google'
              AND connection.status = 'connected'
              AND account.active = TRUE
              AND account.status = 'active'
              AND role.role_name = 'profesor'
              AND role.active = TRUE
              AND role.status = 'active'
              AND (role.expires_at IS NULL
                   OR role.expires_at::timestamptz > now())
              AND profile.approval_status = 'approved'
            LIMIT 5000
            """
        )
    connections = [dict(row) for row in rows]
    succeeded = 0
    failed = 0
    try:
        for connection in connections:
            try:
                await service.sync_busy(connection["user_id"])
                succeeded += 1
            except GoogleCalendarError:
                failed += 1
        async with db._pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM external_busy_blocks
                WHERE expires_at::timestamptz < now() - interval '1 day'
                """
            )
            await conn.execute(
                """
                DELETE FROM google_calendar_oauth_states
                WHERE expires_at::timestamptz < now() - interval '1 day'
                """
            )
    finally:
        await close_pool()
    logger.info(
        "Google Calendar periodic sync complete total=%d succeeded=%d failed=%d",
        len(connections),
        succeeded,
        failed,
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
