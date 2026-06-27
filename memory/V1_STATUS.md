# MOSAICO v1 Status

Version: v1
Date: 2026-06-26

## Production URLs

```text
Frontend: https://mosaico-web.onrender.com
Backend:  https://mosaico-api.onrender.com
API root: https://mosaico-api.onrender.com/api/
```

## Repository

```text
GitHub: https://github.com/elprofejenrri/mosaico-platform
Branch: main
```

Important commits:

```text
1a6290b Initial MOSAICO platform deployment setup
7a5f59d Use free Render plans in blueprint
8da2577 Fix Render static site blueprint plan
611c936 Add httpx backend dependency
d7db7a1 Add product and operations documentation
```

## Current Product State

MOSAICO v1 is a deployed full-stack platform for private online Spanish lessons.

It includes:

- Public React website
- Google login through Supabase Auth
- FastAPI backend deployed on Render
- Supabase PostgreSQL database
- Supabase Storage integration
- Admin platform at `/admin`
- RBAC roles and permissions
- CMS pages
- Blog CMS
- Media library
- Teacher management
- Product/class management
- Booking management
- User management
- Render deployment blueprint
- Product, architecture, deployment, API, schema, operations, and troubleshooting docs

## Authentication State

Google OAuth works in production.

Supabase Auth configuration:

```text
Site URL:
https://mosaico-web.onrender.com

Redirect URLs:
https://mosaico-web.onrender.com/auth/callback
http://localhost:3001/auth/callback
```

Google Cloud OAuth callback:

```text
https://xlimivzjwhfdhkxjdwvl.supabase.co/auth/v1/callback
```

Admin user promotion is controlled by backend env:

```env
ADMIN_EMAILS=ezarate@gmail.com
```

## Render Services

### mosaico-api

Type: Python web service

Expected health check:

```text
https://mosaico-api.onrender.com/api/
```

Expected response:

```json
{"app":"Lily Spanish","ok":true}
```

Important env vars:

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

### mosaico-web

Type: Static site

Important env vars:

```env
REACT_APP_BACKEND_URL=https://mosaico-api.onrender.com
REACT_APP_SUPABASE_URL=https://xlimivzjwhfdhkxjdwvl.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-key>
REACT_APP_DEV_AUTH=false
```

## Local Development

Frontend:

```text
http://localhost:3001
```

Backend:

```text
http://localhost:8002/api/
```

Admin:

```text
http://localhost:3001/admin
```

Local backend command:

```powershell
cd backend
py -3 -m uvicorn server:app --host 127.0.0.1 --port 8002 --reload
```

Local frontend command:

```powershell
cd frontend
$env:PORT="3001"
npm.cmd start
```

## Verification At v1

Last verified:

```text
Frontend build: OK
Backend tests: OK
Production backend /api/: OK
Production frontend: OK
Google login: working
```

Commands:

```powershell
npm.cmd run build
py -3 -m pytest backend\tests
```

## Documentation Index

Core docs:

```text
README.md
docs/PRODUCT_DOCUMENTATION.md
docs/ARCHITECTURE.md
docs/ENVIRONMENT_VARIABLES.md
docs/DEPLOYMENT_GUIDE.md
docs/OPERATIONS_RUNBOOK.md
docs/TROUBLESHOOTING.md
docs/API_REFERENCE.md
docs/DATABASE_SCHEMA.md
```

AI handoff context:

```text
docs/AI_HANDOFF_V1.md
```

