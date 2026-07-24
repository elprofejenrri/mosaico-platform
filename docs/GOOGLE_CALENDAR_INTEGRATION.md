# Google Calendar Integration for Teachers

## Status

The implementation is present locally behind two independent controls:

- Backend environment switch: `GOOGLE_CALENDAR_INTEGRATION_ENABLED`.
- Platform feature flag: `teacher_google_calendar`.

Both must be enabled before the UI or backend connection flow is usable. The
feature flag defaults to disabled. Google Calendar remains optional and is not
required to hold a teacher role.

Google login and Google Calendar authorization are separate. Revoking Calendar
does not delete or disable the MOSAICO account.

## Architecture

```text
Teacher profile
  -> MOSAICO backend creates signed, expiring, single-use state
  -> Google OAuth consent (authorization code, offline access)
  -> backend callback exchanges code
  -> encrypted credentials in PostgreSQL
  -> teacher selects busy calendars and one owned destination calendar
  -> freeBusy stores only normalized occupied intervals
  -> manual availability - Google busy - MOSAICO classes/blocks - buffers
  -> final booking validation
  -> canonical MOSAICO booking
  -> idempotent Google event synchronization
```

MOSAICO is the source of truth for classes. Google Calendar is an external busy
source and an optional destination for MOSAICO-managed events.

## OAuth scopes

| Scope | Reason | Data used | Alternative considered |
| --- | --- | --- | --- |
| `openid` | Identify the connected Google account | Stable account subject | Calendar IDs are not a reliable account identity |
| `email` | Show a partially masked connected account | Email is masked before persistence | Omitting account feedback would make reconnection unsafe/confusing |
| `calendar.calendarlist.readonly` | Let the teacher select calendars | Calendar ID, display name, primary flag, access role, time zone | Hard-coding `primary` would skip explicit selection |
| `calendar.events.freebusy` | Calculate external occupancy | Busy start/end only | Event-list scopes expose unnecessary event data |
| `calendar.events.owned` | Manage MOSAICO events on a teacher-owned calendar | MOSAICO-created event records only | `calendar.events` is broader; `calendar` is full calendar access |

No Gmail, Drive, Contacts, full-calendar, or event-read scopes are requested.
The MVP destination calendar must have Google access role `owner`. Read-only
calendars may be used for busy calculations but never for event writes.

## OAuth security

- Server-side Authorization Code Flow.
- Exact redirect URI comes from backend configuration.
- `state` is HS256-signed, audience-bound, expires after ten minutes, includes a
  cryptographic nonce, and is consumed atomically once in PostgreSQL.
- `access_type=offline`, incremental authorization, explicit consent, and
  account selection are requested.
- Authorization codes are handled by the backend and immediately redirected
  away; they never reach the frontend bundle.
- Access and refresh tokens are encrypted with a configured Fernet key before
  storage.
- Tokens are never returned through API DTOs, browser storage, query strings,
  audit metadata, analytics, or logs.
- Refresh-token absence is accepted only when reconnecting the same Google
  account and a prior encrypted refresh token exists.
- Connecting a different Google account clears prior calendar selections and
  cached busy blocks.

Generate encryption and state secrets outside the repository. Never reuse the
OAuth client secret as either key.

## Data and privacy

The integration stores:

- Encrypted credentials and safe connection state.
- Masked account feedback.
- Granted scope names.
- Selected calendar IDs, display names, access roles, and purpose.
- Busy start/end, source calendar ID, fetch time, and cache expiry.
- MOSAICO class-to-Google-event relationship and synchronization state.

It does not request, import, persist, return, or log personal event titles,
descriptions, attendees, locations, attachments, conference data, or notes.
Teachers see `Occupied by external calendar`; students only see that a slot is
unavailable.

Administrators may use operational/audit data to see connection and sync health,
but must never receive credentials or personal event content.

## Availability and time zones

The free/busy window is limited to 90 days and defaults to 60. Cache freshness
defaults to five minutes. Cache records include the exact covered window; a
fresh timestamp without coverage of the requested slot is not accepted.

Backend timestamps are UTC. User-facing local times require an IANA time zone.
Ambiguous and nonexistent daylight-saving wall times are rejected instead of
guessing an offset.

Effective availability is:

```text
manual teacher availability
- Google busy blocks
- confirmed MOSAICO classes
- administrative blocks
- configured buffers
```

Google never creates availability. A Google error never means that a slot is
free. Public slot queries fail closed by omitting provider-uncertain slots.
Checkout and booking confirmation request fresh free/busy validation.

## Class events and idempotency

Events contain a generic title, class timing, time zone, optional existing
MOSAICO class location, and a direction to manage changes in MOSAICO. Student
identity, payment information, internal authorization data, and tokens are not
included.

The Google event ID is a deterministic hash of MOSAICO booking and teacher
identity. Retries after timeouts therefore cannot create a second event. A
Google `409` is reconciled by updating the deterministic event. An externally
deleted MOSAICO event is recreated during the next authorized reconciliation.

MOSAICO persists sync states:

- `pending`
- `synced`
- `retrying`
- `failed`
- `disconnected`
- `conflict`
- `cancelled`

If event creation fails after a MOSAICO class is confirmed, the class remains
canonical and the event link is marked for retry. A teacher may retry an
assigned class. Cancellation only removes the Google event managed by MOSAICO.

Disconnecting revokes Google authorization when possible, removes local
credentials and busy cache, and stops synchronization. Existing Google events
and MOSAICO classes remain.

## API

Teacher/self endpoints:

```text
GET    /api/integrations/google-calendar/status
POST   /api/integrations/google-calendar/connect
GET    /api/integrations/google-calendar/callback
GET    /api/integrations/google-calendar/calendars
PUT    /api/integrations/google-calendar/settings
POST   /api/integrations/google-calendar/sync
DELETE /api/integrations/google-calendar/disconnect?confirm=true
POST   /api/integrations/google-calendar/events/{booking_id}/retry
GET    /api/teachers/me/calendar-availability
```

All self operations except the public OAuth callback require backend permission
`calendar.teacher.sync_google` and database-derived ownership. A callback
recovers its user only from verified single-use state.

## Google Cloud setup

1. Select or create the approved MOSAICO Google Cloud project.
2. Enable Google Calendar API.
3. Configure the OAuth consent screen, application name, support contact,
   authorized domains, privacy policy, and terms.
4. Declare only the scopes listed in this document.
5. If the consent screen is in testing, add specific test teachers.
6. Review whether Google verification is required before external launch.
7. Create a Web application OAuth client or reuse an approved web client.
8. Add the exact backend callback URL represented by
   `GOOGLE_CALENDAR_REDIRECT_URI`.
9. JavaScript origins are not required for this server-side flow.
10. Store client ID and secret in the backend service environment.
11. Generate separate Fernet and state-signing keys and store them only in the
    backend/cron environment.
12. Configure the frontend return URL.
13. Apply the additive migration.
14. Deploy with the environment switch and feature flag disabled.
15. Enable the environment switch, test with selected teachers, then enable the
    platform feature flag through the governed configuration workflow.

Do not use OAuth Playground refresh tokens or a shared administrator refresh
token for teacher connections.

## Periodic synchronization

Run this command from a Render Cron Job using the same backend environment:

```powershell
python backend/sync_google_calendars.py
```

A five-minute interval matches the default cache TTL. The job retries bounded
provider failures with exponential backoff and jitter, emits aggregate counts,
and removes expired cache/state rows after a retention buffer. It never prints
account identifiers or event content.

Push notification channels are not part of the MVP. They require persisted
channel identity, verified callback handling, renewal, expiration, and recovery;
partial webhook support is intentionally avoided.

## Operations and recovery

Connection states:

- `connected`: credentials are usable.
- `reconnect_required`: refresh failed or Google revoked access.
- `revoked`: disconnected by the teacher.
- `error`: non-recoverable setup/state error.

For rate limits and transient provider failures, keep the MOSAICO booking,
retain retry state, and allow the bounded retry policy/cron job to recover. For
`reconnect_required`, ask the teacher to reconnect. Never copy credentials
between users.

Functional rollback is to disable `teacher_google_calendar`. This removes the UI
and prevents new connection/sync actions without deleting canonical MOSAICO
classes or existing Google events. The additive tables can remain in place.

## Manual validation

Use an approved test Google account and non-production test calendar:

1. Confirm the flag-off UI exposes no connect action.
2. Enable for a test teacher with a complete profile.
3. Connect and deny consent; verify a safe error and a consumed state.
4. Connect successfully; verify the browser never receives tokens.
5. Confirm no calendar is selected automatically.
6. Select multiple busy calendars and one owned destination.
7. Verify read-only calendars cannot be destinations.
8. Create a private Google event and confirm MOSAICO shows only occupied time.
9. Confirm students see no reason or personal data.
10. Attempt checkout over the busy interval and expect conflict.
11. Confirm a MOSAICO class and verify one generic Google event.
12. Repeat/retry and verify no duplicate event.
13. Reprogram and verify the same event ID is updated.
14. Cancel and verify only the MOSAICO event is removed.
15. Delete an event in Google and retry to verify reconciliation.
16. Revoke access in Google and verify `reconnect_required`.
17. Reconnect and verify future classes do not duplicate.
18. Disconnect and verify classes and existing Google events remain.
19. Test UTC, America/Cancun, a DST transition, and differing student/teacher
    time zones.
