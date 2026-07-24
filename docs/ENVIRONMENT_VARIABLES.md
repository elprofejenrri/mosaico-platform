# Environment Variables

Never commit real `.env` files. The repository tracks only `.env.example` files.

## Backend Variables

Location locally:

```text
backend/.env
```

Render service:

```text
mosaico-api
```

Required:

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=require
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_JWT_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
SUPABASE_STORAGE_BUCKET=mosaico
ADMIN_EMAILS=admin@example.com
CORS_ORIGINS=https://mosaico-web.onrender.com
LOCAL_AUTH_SESSION_MINUTES=10080
```

Optional payment variables:

```env
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
```

Optional teacher Google Calendar variables:

```env
GOOGLE_CALENDAR_INTEGRATION_ENABLED=false
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=
GOOGLE_CALENDAR_FRONTEND_RETURN_URL=
GOOGLE_CALENDAR_ENCRYPTION_KEY=
GOOGLE_CALENDAR_STATE_SECRET=
GOOGLE_CALENDAR_SYNC_WINDOW_DAYS=60
GOOGLE_CALENDAR_CACHE_TTL_SECONDS=300
GOOGLE_CALENDAR_REQUEST_TIMEOUT_SECONDS=12
GOOGLE_CALENDAR_MAX_RETRIES=3
```

Optional development variable:

```env
DEV_AUTH=false
```

Do not enable `DEV_AUTH` in production.

### Backend Variable Reference

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `DATABASE_SSL` | Yes | Use `require` for Supabase |
| `SUPABASE_URL` | Yes | Base Supabase project URL, no `/rest/v1` suffix |
| `SUPABASE_JWT_SECRET` | Yes | Supabase JWT secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Secret server-side key for Storage/admin APIs |
| `SUPABASE_ANON_KEY` | Yes | Public anon key, used by backend to validate Supabase Auth token |
| `SUPABASE_STORAGE_BUCKET` | Yes | Storage bucket name, usually `mosaico` |
| `ADMIN_EMAILS` | Yes | Comma-separated Google emails promoted to admin |
| `CORS_ORIGINS` | Yes | Allowed frontend origins |
| `LOCAL_AUTH_SESSION_MINUTES` | No | Local email/password session duration. Defaults to 10080 minutes, or 7 days |
| `STRIPE_API_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `GOOGLE_CALENDAR_INTEGRATION_ENABLED` | No | Backend kill switch; defaults to `false` |
| `GOOGLE_CALENDAR_CLIENT_ID` | When enabled | Google Web OAuth client ID |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | When enabled | Google Web OAuth client secret; backend only |
| `GOOGLE_CALENDAR_REDIRECT_URI` | When enabled | Exact HTTPS backend callback registered in Google Cloud |
| `GOOGLE_CALENDAR_FRONTEND_RETURN_URL` | When enabled | Teacher Calendar route after callback |
| `GOOGLE_CALENDAR_ENCRYPTION_KEY` | When enabled | Fernet key for token encryption at rest |
| `GOOGLE_CALENDAR_STATE_SECRET` | When enabled | Independent secret for signed OAuth state |
| `GOOGLE_CALENDAR_SYNC_WINDOW_DAYS` | No | Free/busy horizon, clamped to 1–90 days |
| `GOOGLE_CALENDAR_CACHE_TTL_SECONDS` | No | Busy-cache freshness, clamped to 30–3600 seconds |
| `GOOGLE_CALENDAR_REQUEST_TIMEOUT_SECONDS` | No | Provider timeout, clamped to 2–30 seconds |
| `GOOGLE_CALENDAR_MAX_RETRIES` | No | Bounded transient retries, clamped to 0–5 |

Generate a valid Fernet key and a separate high-entropy state secret outside the
repository. Never expose them through `REACT_APP_*`, logs, or frontend settings.

## Frontend Variables

Location locally:

```text
frontend/.env
```

Render service:

```text
mosaico-web
```

Required:

```env
REACT_APP_BACKEND_URL=https://mosaico-api.onrender.com
REACT_APP_SUPABASE_URL=https://PROJECT_REF.supabase.co
REACT_APP_SUPABASE_ANON_KEY=...
REACT_APP_DEV_AUTH=false
```

### Frontend Variable Reference

| Variable | Required | Description |
| --- | --- | --- |
| `REACT_APP_BACKEND_URL` | Yes | Backend base URL without `/api` |
| `REACT_APP_SUPABASE_URL` | Yes | Base Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `REACT_APP_DEV_AUTH` | Yes | Use `false` in production |

## Important URL Format

Correct:

```env
SUPABASE_URL=https://xlimivzjwhfdhkxjdwvl.supabase.co
```

Incorrect:

```env
SUPABASE_URL=https://xlimivzjwhfdhkxjdwvl.supabase.co/rest/v1
```

The `/rest/v1` URL is the Data API endpoint, not the base Supabase URL needed for Auth and Storage.
