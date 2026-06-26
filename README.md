# MOSAICO

Independent full-stack app for private online Spanish lessons.

- Frontend: React, CRACO, Tailwind, shadcn-style components
- Backend: FastAPI
- Database/Auth/Storage: Supabase
- Payments: Stripe Checkout
- Deployment target: Render

## Local Setup

Copy the env examples:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Fill in Supabase and Stripe values. Then run:

```powershell
cd backend
py -3 -m pip install -r requirements.txt
py -3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

In another terminal:

```powershell
cd frontend
npm install
npm start
```

## Supabase

Enable Google OAuth in Supabase Auth and add these redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-render-frontend.onrender.com/auth/callback
```

The backend applies `backend/schema.sql` on startup and seeds default public content when tables are empty.

## Render

Use `render.yaml` as the deployment blueprint. Set all secret env vars in Render, not in Git.
