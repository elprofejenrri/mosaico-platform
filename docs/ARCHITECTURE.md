# MOSAICO Architecture

## High-Level Architecture

MOSAICO is a full-stack application with a React frontend, FastAPI backend, and Supabase for database, auth, and storage.

```text
Browser
  |
  | React app
  v
Render Static Site: mosaico-web
  |
  | HTTPS API calls
  v
Render Web Service: mosaico-api
  |
  | asyncpg
  v
Supabase PostgreSQL

Browser
  |
  | Google OAuth via Supabase JS
  v
Supabase Auth

Backend
  |
  | Storage REST API
  v
Supabase Storage

Backend
  |
  | Optional payment API
  v
Stripe

Backend
  |
  | Per-teacher OAuth, free/busy and MOSAICO-owned event sync
  v
Google Calendar / Meet
```

Teacher Calendar authorization is independent from Supabase login. Credentials
are encrypted in PostgreSQL and used only by backend services. Free/busy data
contains no personal event details. The legacy administrator-configured shared
calendar is retained only as a compatibility path and is never reused as
teacher consent.

## Frontend

Location:

```text
frontend/
```

Stack:

- React
- CRACO
- Tailwind CSS
- Radix/shadcn-style components
- Supabase JS client
- Axios
- React Router

Important files:

| File | Purpose |
| --- | --- |
| `frontend/src/App.js` | Route definitions |
| `frontend/src/context/AppContext.jsx` | App state, auth session, language, settings |
| `frontend/src/lib/api.js` | Axios API client and auth token injection |
| `frontend/src/lib/supabase.js` | Supabase browser client |
| `frontend/src/pages/Admin.jsx` | Admin platform UI |
| `frontend/src/pages/AuthCallback.jsx` | OAuth callback code exchange |

## Backend

Location:

```text
backend/
```

Stack:

- FastAPI
- Uvicorn
- Pydantic
- asyncpg
- Supabase PostgreSQL
- Supabase Auth user validation
- Supabase Storage REST API
- Stripe SDK
- Google Calendar API via HTTP

Important files:

| File | Purpose |
| --- | --- |
| `backend/server.py` | FastAPI app, models, auth, routes, seed data |
| `backend/database.py` | PostgreSQL collection-style abstraction |
| `backend/schema.sql` | Database schema and migrations |
| `backend/requirements.txt` | Backend dependencies |

## Database Layer

The backend uses a lightweight collection-style abstraction in `database.py`. It maps named collections to PostgreSQL tables and supports:

- `find_one`
- `find`
- `insert_one`
- `insert_many`
- `update_one`
- `delete_one`
- `count_documents`

This was kept intentionally small so the application can work with PostgreSQL without introducing a full ORM migration.

## Main Database Tables

Core tables:

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `teacher_profiles`
- `student_profiles`
- `teachers`
- `products`
- `availability`
- `bookings`
- `external_calendar_connections`
- `external_calendar_selections`
- `external_busy_blocks`
- `calendar_event_links`
- `google_calendar_oauth_states`
- `blog_posts`
- `pages`
- `media_assets`
- `files`
- `payment_transactions`
- `site_settings`
- `login_history`

The schema is applied automatically on backend startup:

```python
schema_sql = schema_path.read_text(encoding="utf-8")
await conn.execute(schema_sql)
```

## Authentication Architecture

Frontend:

- Starts OAuth using `supabase.auth.signInWithOAuth`.
- Redirects to `/auth/callback`.
- Exchanges `code` for session with `exchangeCodeForSession(code)`.
- Stores Supabase session in browser storage.
- Sends access token as:

```http
Authorization: Bearer <token>
```

Backend:

- Receives access token.
- Validates token against:

```text
SUPABASE_URL/auth/v1/user
```

- Creates or updates internal user.
- Applies role normalization.
- Records login history.

## Authorization Architecture

Role-to-permission mappings live in `backend/server.py`.

Key concepts:

- `ROLE_ALIASES`
- `ROLE_PERMISSIONS`
- `require_admin`
- `require_permission(permission)`

Example route protection:

```python
@api.get("/admin/pages")
async def admin_list_pages(_: User = Depends(require_permission("cms:manage"))):
    ...
```

## Storage Architecture

Admin uploads use Supabase Storage when the following are configured:

```env
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
```

The backend creates the bucket on startup if needed. If the bucket already exists, startup continues normally.

## Deployment Architecture

Teacher free/busy can be refreshed by an optional Render Cron Job running
`python backend/sync_google_calendars.py`. Google push-notification webhooks are
deferred until channel validation, renewal, expiry and recovery can be delivered
together.

Deployment target:

```text
Render
```

Services:

- `mosaico-api`: Python web service
- `mosaico-web`: static React site

Blueprint:

```text
render.yaml
```
