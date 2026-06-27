# MOSAICO v1 AI Handoff Context

Use this document to brief another AI or engineer on the current MOSAICO project state. It intentionally avoids real secret values.

## Identity

Project name:

```text
MOSAICO
```

Version:

```text
v1
```

Primary purpose:

```text
A bilingual platform for private online Spanish lessons, including public website, Google login, booking/payment scaffolding, CMS, and administrative operations.
```

Production URLs:

```text
Frontend: https://mosaico-web.onrender.com
Backend:  https://mosaico-api.onrender.com
API root: https://mosaico-api.onrender.com/api/
```

Repository:

```text
https://github.com/elprofejenrri/mosaico-platform
```

## Current Tech Stack

Frontend:

- React
- CRACO
- Tailwind CSS
- Radix/shadcn-style components
- Supabase JS
- Axios
- React Router

Backend:

- FastAPI
- Uvicorn
- Pydantic
- asyncpg
- Supabase Auth validation
- Supabase Storage REST API
- Stripe SDK
- Google Calendar HTTP integration scaffold

Database/Auth/Storage:

- Supabase PostgreSQL
- Supabase Auth with Google provider
- Supabase Storage bucket `mosaico`

Deployment:

- Render Blueprint
- `mosaico-api` as Python web service
- `mosaico-web` as static site

## Important Paths

```text
backend/server.py
backend/database.py
backend/schema.sql
backend/requirements.txt
frontend/src/context/AppContext.jsx
frontend/src/lib/api.js
frontend/src/lib/supabase.js
frontend/src/pages/AuthCallback.jsx
frontend/src/pages/Admin.jsx
frontend/src/components/Navbar.jsx
render.yaml
README.md
docs/
memory/V1_STATUS.md
```

## Product Modules

Public site:

- Home
- Pricing
- FAQ
- Blog
- Blog detail
- Booking entry points
- Dashboard

Admin site:

- Dashboard summary cards
- User catalogue
- Role view
- Availability management
- Teacher management
- Product/class management
- CMS pages
- Blog CMS
- Media library
- Public content management
- Settings
- Bookings
- Students

## Auth Flow

Frontend starts login with:

```js
supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    queryParams: { prompt: "select_account" },
  },
})
```

Callback route:

```text
frontend/src/pages/AuthCallback.jsx
```

The callback:

1. Reads `code` from URL query.
2. Calls `supabase.auth.exchangeCodeForSession(code)`.
3. Calls backend `/api/auth/me`.
4. Navigates to `/admin`.

Backend auth:

1. Frontend sends Supabase access token as Bearer token.
2. Backend calls:

```text
SUPABASE_URL/auth/v1/user
```

3. Backend creates or updates internal `users` row.
4. Backend promotes user if email is in `ADMIN_EMAILS`.
5. Backend records login history.

Important:

- Local dev bypass existed but is disabled by `REACT_APP_DEV_AUTH=false`.
- `mosaico_dev_token` is ignored unless `REACT_APP_DEV_AUTH=true`.
- Do not enable dev auth in production.

## Roles

Current RBAC roles:

```text
administrador_sitio
administrador_profesor
profesor
editor_cms
alumno
```

Legacy aliases:

```text
admin -> administrador_sitio
student -> alumno
```

Admin promotion:

```env
ADMIN_EMAILS=ezarate@gmail.com
```

Role permissions are defined in `backend/server.py`:

```python
ROLE_PERMISSIONS = {...}
```

Route guards:

```python
require_admin
require_permission(permission)
```

## Database

Schema source:

```text
backend/schema.sql
```

Database tables:

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
- `blog_posts`
- `pages`
- `media_assets`
- `files`
- `payment_transactions`
- `site_settings`
- `login_history`

The backend auto-applies the schema on startup using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

Database abstraction:

```text
backend/database.py
```

It exposes Mongo-like helpers over PostgreSQL:

- `find_one`
- `find`
- `insert_one`
- `insert_many`
- `update_one`
- `delete_one`
- `count_documents`

## API

Base URLs:

```text
Local:      http://localhost:8002/api
Production: https://mosaico-api.onrender.com/api
```

Health:

```text
GET /api/
```

Expected:

```json
{"app":"Lily Spanish","ok":true}
```

Full API documentation:

```text
docs/API_REFERENCE.md
```

## Environment Variables

Do not commit real `.env` files.

Backend production env:

```env
DATABASE_URL=<supabase-postgres-url>
DATABASE_SSL=require
SUPABASE_URL=https://xlimivzjwhfdhkxjdwvl.supabase.co
SUPABASE_JWT_SECRET=<secret>
SUPABASE_SERVICE_ROLE_KEY=<secret>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_STORAGE_BUCKET=mosaico
ADMIN_EMAILS=ezarate@gmail.com
CORS_ORIGINS=https://mosaico-web.onrender.com
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
```

Frontend production env:

```env
REACT_APP_BACKEND_URL=https://mosaico-api.onrender.com
REACT_APP_SUPABASE_URL=https://xlimivzjwhfdhkxjdwvl.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-key>
REACT_APP_DEV_AUTH=false
```

Important Supabase URL rule:

Correct:

```text
https://xlimivzjwhfdhkxjdwvl.supabase.co
```

Incorrect:

```text
https://xlimivzjwhfdhkxjdwvl.supabase.co/rest/v1
```

## Supabase Configuration

Supabase project ref:

```text
xlimivzjwhfdhkxjdwvl
```

Auth URL configuration:

```text
Site URL:
https://mosaico-web.onrender.com

Redirect URLs:
https://mosaico-web.onrender.com/auth/callback
http://localhost:3001/auth/callback
```

Google provider:

- Enabled
- Uses Google Cloud OAuth Client ID and Client Secret

Google Cloud authorized redirect URI:

```text
https://xlimivzjwhfdhkxjdwvl.supabase.co/auth/v1/callback
```

Storage bucket:

```text
mosaico
```

## Render Configuration

Blueprint:

```text
render.yaml
```

Backend service:

```text
name: mosaico-api
runtime: python
rootDir: backend
buildCommand: pip install -r requirements.txt
startCommand: uvicorn server:app --host 0.0.0.0 --port $PORT
```

Frontend service:

```text
name: mosaico-web
runtime: static
rootDir: frontend
buildCommand: npm install && npm run build
staticPublishPath: build
```

SPA rewrite:

```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

## Known Previous Issues And Fixes

### `PROJECT_REF.supabase.co` DNS error

Cause:

Frontend had placeholder Supabase URL.

Fix:

Use real project URL.

### Supabase Storage invalid path

Cause:

`SUPABASE_URL` had `/rest/v1` suffix.

Fix:

Use base Supabase URL only.

### OAuth `grant_type=pkce` 400

Cause:

Callback passed full URL to `exchangeCodeForSession`.

Fix:

Pass only `code`.

### `/api/auth/me` 401 after Google login

Cause:

Backend local JWT decode was incompatible with live token path.

Fix:

Backend now validates token through Supabase Auth `/auth/v1/user`.

### Render backend `ModuleNotFoundError: httpx`

Cause:

Missing `httpx` in `backend/requirements.txt`.

Fix:

Added:

```text
httpx>=0.27.0
```

### Render Blueprint `no such plan free`

Cause:

Static site had `plan: free`.

Fix:

Removed `plan` from static site. Static sites are free by default.

## Verification Commands

Backend tests:

```powershell
py -3 -m pytest backend\tests
```

Frontend build:

```powershell
cd frontend
npm.cmd run build
```

Production backend health:

```powershell
Invoke-RestMethod https://mosaico-api.onrender.com/api/
```

Expected:

```json
{"app":"Lily Spanish","ok":true}
```

## Current v1 Verification

At v1 handoff:

- GitHub repo exists and has latest documentation.
- Render backend responds.
- Render frontend responds.
- Google OAuth works.
- Admin access works after email admin promotion.
- Frontend build passes.
- Backend tests pass.

## Recommended Next Work

Near-term:

1. Buy and configure a custom domain.
2. Configure domain in Render.
3. Update Supabase Site URL and Redirect URLs.
4. Update Google OAuth branding and authorized redirect URI if auth domain changes.
5. Configure Stripe live/test keys.
6. Configure Google Calendar integration.
7. Add formal migration tool if schema changes become frequent.
8. Add more backend tests for RBAC and CMS endpoints.
9. Consider migrating frontend to TypeScript if that remains a hard requirement.

## Constraints For Future AI Agents

- Do not expose or commit `.env` secrets.
- Keep `REACT_APP_DEV_AUTH=false` in production.
- Do not include `/rest/v1` in `SUPABASE_URL`.
- Preserve Render service URLs unless explicitly changing deployment.
- Prefer small, compatible changes over large rewrites.
- Existing frontend is React JavaScript, not TypeScript.
- Existing backend uses a small PostgreSQL collection abstraction, not SQLAlchemy/Prisma.
- Admin platform is functional but can be expanded.

