# Troubleshooting

## Google Login Opens `PROJECT_REF.supabase.co`

Cause:

The frontend is still using placeholder Supabase URL.

Fix:

```env
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

Restart frontend.

## Supabase Auth Returns `400 Bad Request` On `grant_type=pkce`

Cause:

OAuth callback code exchange is malformed or stale browser state exists.

Fix:

1. Clear browser storage:

```js
localStorage.clear()
sessionStorage.clear()
location.href = "/admin"
```

2. Confirm callback route uses `exchangeCodeForSession(code)`.
3. Confirm redirect URL is configured in Supabase:

```text
https://mosaico-web.onrender.com/auth/callback
http://localhost:3001/auth/callback
```

## `/api/auth/me` Returns 401 After Google Login

Cause:

Backend cannot validate Supabase token.

Check backend env:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Also confirm `SUPABASE_URL` has no `/rest/v1` suffix.

## Admin Page Returns 403

Cause:

User authenticated successfully but does not have an admin/editor role.

Fix:

Add user email to:

```env
ADMIN_EMAILS=user@example.com
```

Restart backend and sign in again.

## Render Backend Fails With `ModuleNotFoundError`

Cause:

Missing backend dependency in `backend/requirements.txt`.

Fix:

Add the missing package, commit, push, and redeploy.

Example previous issue:

```text
ModuleNotFoundError: No module named 'httpx'
```

Fixed by:

```txt
httpx>=0.27.0
```

## Render Blueprint Says `no such plan free`

Cause:

Static sites do not accept `plan: free` in Render Blueprint.

Fix:

Use `plan: free` only on the backend web service. Static sites are free by default.

## Refreshing `/admin` Shows 404 In Production

Cause:

Static site does not rewrite SPA routes to `index.html`.

Fix:

In `render.yaml`, static site must include:

```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

## CORS Errors In Browser

Cause:

Backend `CORS_ORIGINS` does not include frontend URL.

Fix:

In Render `mosaico-api`:

```env
CORS_ORIGINS=https://mosaico-web.onrender.com
```

For local:

```env
CORS_ORIGINS=http://localhost:3001
```

For both:

```env
CORS_ORIGINS=http://localhost:3001,https://mosaico-web.onrender.com
```

## Backend Startup Storage Warning

If logs show bucket duplicate/already exists, it is harmless. The backend continues.

If Storage requests fail with invalid path, check:

```env
SUPABASE_URL=https://PROJECT_REF.supabase.co
```

It must not include:

```text
/rest/v1
```

## Frontend Uses Old Environment Values

React environment variables are baked at build time.

Fix:

1. Change Render env var.
2. Redeploy `mosaico-web`.

Local:

1. Stop frontend dev server.
2. Restart with `npm.cmd start`.

