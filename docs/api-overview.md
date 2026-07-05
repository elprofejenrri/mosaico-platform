# API Overview

## Base URLs

```text
Local:      http://localhost:8002/api
Production: https://mosaico-api.onrender.com/api
```

## Authentication

Authenticated requests use:

```http
Authorization: Bearer <supabase_access_token_or_mosaico_local_token>
X-Request-ID: <optional-client-request-id>
```

The API returns `X-Request-ID` on responses.

## Main Groups

- `/auth/*`: registration, login, current user, logout.
- `/products`, `/teachers`, `/blog`, `/settings/public`: public data.
- `/bookings/me`: student bookings.
- `/payments/*`: Stripe checkout and status.
- `/admin/*`: admin operations.
- `/admin/rbac/*`: roles and permissions.
- `/admin/configuration/settings`: platform settings.
- `/admin/analytics/overview`: analytics dashboard.
- `/admin/audit-logs`: audit trail.
- `/admin/activity-logs`: activity timeline.
- `/analytics/events`: product event ingestion.
- `/technical/docs`: in-platform technical wiki.

## Error Format

```json
{
  "code": "forbidden",
  "message": "Insufficient permissions",
  "details": {},
  "requestId": "req_...",
  "timestamp": "2026-07-05T00:00:00+00:00"
}
```

See `docs/API_REFERENCE.md` for endpoint details.
