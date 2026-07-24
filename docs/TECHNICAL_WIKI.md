# Technical Wiki

MOSAICO now includes an in-platform technical wiki for technical roles.

## Route

```text
/technical/wiki
```

## Access Rule

The page is visible and accessible only to technical users.

Current access rule:

- `administrador_sitio`
- `developer`
- effective permission `technical.wiki.view`
- or effective wildcard permission `*` with level `100`

Non-authenticated users are redirected to `/login`.

Authenticated non-technical users see an access-required screen.

The frontend applies the rule to navigation and route rendering. The backend
applies the same technical-access rule to every document response, so hiding a
link is not treated as an authorization boundary.

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

Every production release must update both the production history in this
document and the structured in-application history in
`frontend/src/data/productionReleases.json` in the same change set. Entries
must remain identical and newest first. This repository uses a focused
dual-source approach; `npm run validate:releases` verifies synchronization.

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

When a release changes UI, API behavior, data, security, or workflows, update
the corresponding focused documentation in the same change set.

## Release-note safety

In-application release notes describe results and observable behavior only.
They must not include secrets, credentials, tokens, keys, identifiers, internal
URLs, private endpoints, repository paths, delivery-system names,
infrastructure details, data-storage internals, authorization mechanics,
exploit details, bypass conditions, defensive gaps, or sensitive failure
modes. Restricted engineering documentation is the correct location for
implementation and security detail.

The detailed outcome list is authoritative. The summary must accurately
condense those outcomes and must not introduce a conflicting claim.

## Production release history

Releases are listed in descending order. No reliable tag or formal release
record existed when this history was introduced, so the first entry records
only the initial documented baseline delivered by this feature.

<!-- RELEASE: 2026.07.23.2 -->
### 2026.07.23.2 — School-aware access and simpler profiles

Summary: MOSAICO now gives each team member clearer access to the workspaces and information relevant to their responsibilities.

- The profile menu now combines available workspaces into one responsive dropdown.
- School teams can manage user access for the correct school from the administration workspace.
- Finance users have a dedicated workspace for reviewing payments and recording approved account adjustments.
- Google sign-in now displays a clear message when it cannot start or finish.
- Operational checks detect inconsistent access records before a release.
<!-- /RELEASE -->

<!-- RELEASE: 2026.07.23.1 -->
### 2026.07.23.1 — In-app production history

Summary: Technical users can review a safe, accessible production release history inside MOSAICO.

- Authorized technical users can review production outcomes without leaving MOSAICO.
- Each release can be expanded with a keyboard or pointer, with the newest release open by default.
- The release view remains readable on narrow screens and keeps long histories independently scrollable.
- A synchronization check detects duplicate, incomplete, out-of-order, or mismatched release records.
<!-- /RELEASE -->

## Release verification checklist

1. Update the Markdown and structured application histories together.
2. Keep the newest unique version first.
3. Confirm the summary matches the detailed outcomes.
4. Review visible wording against the release-note safety policy.
5. Update every focused document affected by the release.
6. Run the release synchronization validation, frontend tests, and production build.
7. Verify authorized and unauthorized navigation behavior.
8. Verify keyboard operation, expansion, release count, and narrow-screen layout.

## Release Phrase

When the user says `magic`, run the safe release checklist from:

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
