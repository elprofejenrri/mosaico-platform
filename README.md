# MOSAICO

MOSAICO is a SaaS platform for online Spanish education. It combines a public site, student/tutor portals, teacher operations, administrative controls, RBAC, audit logs, product analytics, payments, scheduling, and internal technical documentation.

Production targets:

```text
Frontend: https://mosaico-web.onrender.com
Backend:  https://mosaico-api.onrender.com
```

## Stack

- Frontend: React, CRACO, Tailwind CSS, Radix/shadcn-style components, Axios, Supabase JS.
- Backend: FastAPI, Uvicorn, Pydantic, asyncpg.
- Database/Auth/Storage: Supabase PostgreSQL, Supabase Auth, Supabase Storage.
- Payments: Stripe Checkout.
- Calendar: Google Calendar integration surface, currently partially mocked in teacher workspace.
- Deployment: Render Blueprint via `render.yaml`.

## Start Here

- [Product Overview](docs/product-overview.md)
- [Roadmap](docs/roadmap.md)
- [Business Structure](docs/business-structure.md)
- [Admin Guide](docs/admin-guide.md)
- [User Roles](docs/user-roles.md)
- [RBAC Permissions](docs/rbac-permissions.md)
- [API Overview](docs/api-overview.md)
- [Analytics Events](docs/analytics-events.md)
- [Audit Logs](docs/audit-logs.md)
- [Environment Setup](docs/environment-setup.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Testing Guide](docs/testing-guide.md)
- [Production Readiness Checklist](docs/production-readiness-checklist.md)
- [Security Checklist](docs/security-checklist.md)
- [Release Process](docs/release-process.md)
- [Final Production Report](docs/final-production-report.md)

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
Backend:  http://localhost:8002/api
Admin:    http://localhost:3001/admin
Wiki:     http://localhost:3001/technical/wiki
```

## Database

The backend applies `backend/schema.sql` on startup. The schema is idempotent and includes users, roles, permissions, bookings, availability, products, content, settings, audit logs, activity logs, analytics events, and error events.

## Testing

```powershell
python -m py_compile backend\server.py backend\database.py
python -m pytest backend\tests\test_super_admin_configuration.py -q
cd frontend
npm test -- --watchAll=false --passWithNoTests
npm run build
```

The legacy `backend/tests/test_lily_api.py` suite expects a running API and optional Supabase test tokens.

## Deployment

Use `render.yaml` as the Render Blueprint. Configure secrets in Render, never in Git. Production should set `MOSAICO_ENV=production` or `APP_ENV=production`, real Supabase values, locked `CORS_ORIGINS`, and `REACT_APP_DEV_AUTH=false`.
