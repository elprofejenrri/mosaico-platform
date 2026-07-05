# Environment Setup

## Local

Backend:

```powershell
Copy-Item backend/.env.example backend/.env
cd backend
py -3 -m pip install -r requirements.txt
py -3 -m uvicorn server:app --host 127.0.0.1 --port 8002 --reload
```

Frontend:

```powershell
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm install
$env:PORT="3001"
npm.cmd start
```

## Required Backend Variables

- `DATABASE_URL`
- `DATABASE_SSL`
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `ADMIN_EMAILS`
- `CORS_ORIGINS`
- `LOCAL_AUTH_SESSION_MINUTES`
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Required Frontend Variables

- `REACT_APP_BACKEND_URL`
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_DEV_AUTH`

## Production Rules

- `REACT_APP_DEV_AUTH=false`.
- Use real Supabase values.
- Lock `CORS_ORIGINS` to production frontend domain.
- Set `MOSAICO_ENV=production` or `APP_ENV=production`.
- Never commit secrets.
