# Technical Wiki

MOSAICO now includes an in-platform technical wiki for technical roles.

## Route

```text
/technical/wiki
```

## Access Rule

The page is visible and accessible only to technical users.

Current frontend rule:

- `administrador_sitio`
- `developer`
- or effective wildcard permission `*` with level `100`

Non-authenticated users are redirected to `/login`.

Authenticated non-technical users see an access-required screen.

## Purpose

The wiki gives technical operators a navigable, in-product view of the platform documentation. Documents are read inside MOSAICO; technical users do not need to open GitHub, external apps, or external websites.

- platform roadmap
- Phase 1 execution plan
- architecture
- deployment
- operations
- troubleshooting
- database schema
- database standardization plan
- backfill audit script
- API reference
- environment configuration

## Documentation Rule

Every platform change must update existing documentation or create new documentation.

When a feature changes, update at least one of:

- `docs/PLATFORM_ROADMAP.md`
- `docs/PHASE_1_EXECUTION_PLAN.md`
- `docs/API_REFERENCE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_DOCUMENTATION.md`
- feature-specific docs

If none of those fit, create a new doc and add it to the technical wiki data source:

```text
frontend/src/data/technicalWiki.js
```

## Release Phrase

When the user says `Turn the lights on`, run the safe release checklist from:

```text
docs/OPERATIONS_RUNBOOK.md
```

This means: commit, merge if needed, push, backfill if needed, verify safety, and do not break production.

## Internal Document Reader

The wiki includes an internal document reader backed by protected API endpoints:

```text
GET /api/technical/docs
GET /api/technical/docs/{doc_id}
```

The backend only serves allowlisted files from this repository. The frontend renders the Markdown content inside `/technical/wiki`.

When a document is added to the wiki, update both:

- backend allowlist in `backend/server.py`
- frontend navigation in `frontend/src/data/technicalWiki.js`

## Implementation Files

- `frontend/src/pages/TechnicalWiki.jsx`
- `frontend/src/data/technicalWiki.js`
- `frontend/src/lib/access.js`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/App.js`
- `backend/server.py`

## Related Admin UI

The modern administrative portal includes a real user and role management screen:

```text
/admin/users
```

This screen uses the backend user and RBAC endpoints to show database users, active status, assigned roles, login history, and audit events.
