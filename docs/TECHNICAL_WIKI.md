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
- unified profile model
- environment configuration
- mobile UX and navigation standard

## Unified profile architecture

The production profile contract is documented in `docs/PROFILE_MODEL.md`.
It covers shared identity data, role extensions, completion, teacher approval,
RBAC-derived relationship data, media uploads, and value-free audit events.

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

Mobile shell, responsive navigation, and contextual action changes must follow
`docs/MOBILE_UX_AND_NAVIGATION_STANDARD.md`.

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

## Teacher Google Calendar integration

The local implementation provides separate per-teacher OAuth, encrypted token
storage, verified calendar selection, privacy-preserving free/busy cache,
fail-closed booking validation, and idempotent MOSAICO event synchronization.
It is controlled by both `GOOGLE_CALENDAR_INTEGRATION_ENABLED` and
`teacher_google_calendar`, which default to disabled.

See `docs/GOOGLE_CALENDAR_INTEGRATION.md` for scopes, privacy, Google Cloud
setup, migration, cron, recovery, rollback, and manual validation. The
integration ships disabled and requires the governed external configuration
and pilot workflow before teachers can connect it.

## Production release history

Releases are listed in descending order. No reliable tag or formal release
record existed when this history was introduced, so the first entry records
only the initial documented baseline delivered by this feature.

<!-- RELEASE: 2026.07.24.3 -->
### 2026.07.24.3 — Localized production release dates

Summary: Production history now shows clear release dates in the active English or Spanish language.

Release date: 2026-07-24

- Each production-history entry shows its release date alongside the version.
- Release dates follow the active English or Spanish language without shifting across time zones.
- Release history checks keep documented dates complete, valid, synchronized, and newest first.
<!-- /RELEASE -->

<!-- RELEASE: 2026.07.24.2 -->
### 2026.07.24.2 — Mobile workspaces and reliable role updates

Summary: MOSAICO now keeps workspaces usable on mobile and tablet while making authorized role updates more reliable.

Release date: 2026-07-24

- Mobile and tablet users can open role-appropriate navigation without leaving or resetting the current screen.
- Supported workspaces show contextual page actions only when real, available operations exist.
- Navigation and page-action drawers support keyboard dismissal, focus management, safe touch targets, and English or Spanish labels.
- Teacher calendar, profile, finance, configuration, and identity workspaces provide responsive access to their relevant operations.
- Authorized administrators can update user roles consistently while read-only users remain unable to change assignments.
<!-- /RELEASE -->

<!-- RELEASE: 2026.07.24.1 -->
### 2026.07.24.1 — Unified profiles and teacher calendar readiness

Summary: MOSAICO now provides clearer profile management and the protected foundation for optional teacher calendar synchronization.

Release date: 2026-07-24

- Users can review and maintain shared profile information from a dedicated profile workspace.
- Role-specific profile details and teacher approval status are presented consistently across workspaces.
- The active profile selector remains available as a responsive dropdown.
- Teachers have a privacy-focused calendar connection experience that remains unavailable until the governed integration is enabled.
- Booking safeguards can account for connected teacher availability without exposing personal calendar details.
<!-- /RELEASE -->

<!-- RELEASE: 2026.07.23.3 -->
### 2026.07.23.3 — Technical release access restored

Summary: Technical administrators can now reach the platform wiki and production release history from their workspace.

Release date: 2026-07-23

- The Wiki option is now visible to authorized technical administrators.
- Technical administrators can open the Releases tab and review production outcomes.
<!-- /RELEASE -->

<!-- RELEASE: 2026.07.23.2 -->
### 2026.07.23.2 — School-aware access and simpler profiles

Summary: MOSAICO now gives each team member clearer access to the workspaces and information relevant to their responsibilities.

Release date: 2026-07-23

- The profile menu now combines available workspaces into one responsive dropdown.
- School teams can manage user access for the correct school from the administration workspace.
- Finance users have a dedicated workspace for reviewing payments and recording approved account adjustments.
- Google sign-in now displays a clear message when it cannot start or finish.
- Operational checks detect inconsistent access records before a release.
<!-- /RELEASE -->

<!-- RELEASE: 2026.07.23.1 -->
### 2026.07.23.1 — In-app production history

Summary: Technical users can review a safe, accessible production release history inside MOSAICO.

Release date: 2026-07-23

- Authorized technical users can review production outcomes without leaving MOSAICO.
- Each release can be expanded with a keyboard or pointer, with the newest release open by default.
- The release view remains readable on narrow screens and keeps long histories independently scrollable.
- A synchronization check detects duplicate, incomplete, out-of-order, or mismatched release records.
<!-- /RELEASE -->

## Release verification checklist

1. Update the Markdown and structured application histories together.
2. Include an ISO `Release date` and keep the newest unique version first.
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
- `frontend/src/components/mobile/MobileWorkspaceHeader.jsx`
- `frontend/src/context/MobileShellContext.jsx`
- `frontend/src/App.js`
- `backend/server.py`

## Related Admin UI

The modern administrative portal includes a real user and role management screen:

```text
/admin/users
```

This screen uses the backend user and RBAC endpoints to show database users, active status, assigned roles, login history, and audit events.
