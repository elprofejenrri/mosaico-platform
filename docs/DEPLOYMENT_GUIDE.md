# Deployment Guide

## Environment Strategy

### Local

Purpose: developer work and fast iteration.

- Uses `.env` files.
- Can use dev auth only when explicitly enabled.
- Data can be disposable.
- No production secrets.

### Alpha

Purpose: internal validation by product and technical users.

- Seeded test data.
- Limited admin access.
- Feature flags can expose incomplete modules.
- Deploy from main or release branch after build/test pass.

### Beta

Purpose: invited real users and teachers.

- Production-like data rules.
- Real auth.
- Real payment sandbox or controlled live payments.
- Support process and request IDs required.
- Feature flags hide unfinished workflows.

### Production

Purpose: real users, real payments, real operations.

- Real Supabase project and backups.
- `REACT_APP_DEV_AUTH=false`.
- `MOSAICO_ENV=production` or `APP_ENV=production`.
- Locked `CORS_ORIGINS`.
- Rollback plan documented before release.

## Deployment Flow

1. Run backend compile, backend tests, frontend tests, and frontend build.
2. Review database/schema changes.
3. Deploy Alpha.
4. Smoke test.
5. Promote to Beta or Production.
6. Monitor logs, audit events, analytics, and support requests.

## Feature Flags

Use platform configuration feature flags to hide modules that are not production-backed. Do not expose mock workflows to real users without a clear preview label.

## Rollback

- Use Render deploy rollback for frontend/backend.
- If schema changed, confirm rollback compatibility before reverting.
- Disable risky features through configuration if code rollback is slower.
- Record incident notes and follow-up tasks.

## Production Target

MOSAICO is deployed on Render using:

- `mosaico-api`: FastAPI backend
- `mosaico-web`: React static site

Production URLs:

```text
Backend:  https://mosaico-api.onrender.com
Frontend: https://mosaico-web.onrender.com
```

## Pre-Deployment Checklist

Before deploying, confirm:

- Code is pushed to GitHub.
- `backend/.env` and `frontend/.env` are not committed.
- `render.yaml` exists at the repository root.
- Supabase database connection works locally.
- Supabase Google provider is enabled.
- Google OAuth client is configured.
- Render environment variables are complete.

## Render Blueprint

The repo includes:

```text
render.yaml
```

It defines:

- Python backend web service
- Static frontend service
- SPA rewrite for frontend routes
- Environment variable placeholders

## Backend Render Settings

Service:

```text
mosaico-api
```

Runtime:

```text
Python
```

Root directory:

```text
backend
```

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

Health check:

```text
https://mosaico-api.onrender.com/api/
```

Expected response:

```json
{"app":"Lily Spanish","ok":true}
```

## Frontend Render Settings

Service:

```text
mosaico-web
```

Runtime:

```text
Static Site
```

Root directory:

```text
frontend
```

Build command:

```bash
npm install && npm run build
```

Publish directory:

```text
build
```

SPA rewrite:

```text
/* -> /index.html
```

## Supabase Production Auth URLs

In Supabase:

```text
Authentication -> URL Configuration
```

Set:

```text
Site URL:
https://mosaico-web.onrender.com
```

Redirect URLs:

```text
https://mosaico-web.onrender.com/auth/callback
http://localhost:3001/auth/callback
```

## Google Cloud OAuth

Google Cloud OAuth credential must contain Supabase callback:

```text
https://xlimivzjwhfdhkxjdwvl.supabase.co/auth/v1/callback
```

The user-facing Google consent screen can be branded as MOSAICO in:

```text
Google Cloud -> APIs & Services -> OAuth consent screen
```

## Deployment Flow

1. Commit changes locally.
2. Push to GitHub.
3. Render auto-deploys or run:

```text
Manual Deploy -> Deploy latest commit
```

4. Check backend logs.
5. Check frontend build logs.
6. Open:

```text
https://mosaico-web.onrender.com/admin
```

7. Test Google login.

## Post-Deployment Verification

Backend:

```text
https://mosaico-api.onrender.com/api/
```

Frontend:

```text
https://mosaico-web.onrender.com
```

Admin:

```text
https://mosaico-web.onrender.com/admin
```

Expected backend logs:

```text
PostgreSQL pool ready (Supabase)
Application startup complete
```
