# Deployment Notes

Target platform: Render.

Backend service:

- Runtime: Python
- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`

Frontend service:

- Runtime: Static Site
- Root directory: `frontend`
- Build: `yarn install --frozen-lockfile=false && yarn build`
- Publish directory: `build`

Required backend env vars:

- `DATABASE_URL`
- `DATABASE_SSL=require`
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=mosaico`
- `ADMIN_EMAILS`
- `CORS_ORIGINS`
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`

Required frontend env vars:

- `REACT_APP_BACKEND_URL`
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
