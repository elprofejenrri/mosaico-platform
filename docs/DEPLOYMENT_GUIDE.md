# Deployment Guide

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

