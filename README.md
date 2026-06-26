# MOSAICO

Full-stack platform for private online Spanish lessons.

Production:

```text
Frontend: https://mosaico-web.onrender.com
Backend:  https://mosaico-api.onrender.com
```

## Stack

- Frontend: React, CRACO, Tailwind CSS, Radix/shadcn-style components
- Backend: FastAPI, Uvicorn, asyncpg
- Database/Auth/Storage: Supabase
- Payments: Stripe Checkout
- Deployment: Render

## Documentation

Start here:

- [Product Documentation](docs/PRODUCT_DOCUMENTATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Environment Variables](docs/ENVIRONMENT_VARIABLES.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [API Reference](docs/API_REFERENCE.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)

## Local Setup

Copy environment examples:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Install and run backend:

```powershell
cd backend
py -3 -m pip install -r requirements.txt
py -3 -m uvicorn server:app --host 127.0.0.1 --port 8002 --reload
```

Install and run frontend:

```powershell
cd frontend
npm install
$env:PORT="3001"
npm.cmd start
```

Local URLs:

```text
Frontend: http://localhost:3001
Backend:  http://localhost:8002/api/
Admin:    http://localhost:3001/admin
```

## Deployment

Use `render.yaml` as the Render Blueprint. Set real secret values in Render environment variables, never in Git.

See [Deployment Guide](docs/DEPLOYMENT_GUIDE.md).
