# Mosaico Atlas

## Purpose

Mosaico Atlas is the internal, version-controlled source of truth for product, business, engineering, operations, UX, security, analytics, investor, and roadmap documentation.

## Routes

- `/admin/atlas`: Atlas workspace.
- `/admin/atlas/volumes/:slug`: volume detail and section editor.

## Permissions

- `atlas.view`: read approved Atlas content.
- `atlas.manage`: full Atlas management.
- `atlas.create`: create volumes.
- `atlas.edit`: edit volumes and sections.
- `atlas.delete`: delete Atlas content.
- `atlas.review`: send/review content.
- `atlas.approve`: approve or deprecate content.
- `atlas.export`: export Atlas content.
- `atlas.settings.manage`: manage Atlas settings.
- `atlas.decision_log.manage`: manage decisions.
- `atlas.glossary.manage`: manage glossary terms.
- `atlas.audit.view`: view Atlas audit trail.

Super Admin retains full access through wildcard permission.

## Data Model

Atlas uses these persistent tables:

- `atlas_volumes`
- `atlas_sections`
- `atlas_versions`
- `atlas_decision_logs`
- `atlas_reviews`
- `atlas_comments`
- `atlas_glossary_terms`
- `atlas_attachments`
- `atlas_audit_logs`

The backend also writes sensitive Atlas actions into the global `audit_events` table.

## Seed Data

Startup seeds 25 core volumes:

0. Master Index & Decision Log
1. Company Vision
2. Market Intelligence
3. Product Strategy
4. Product Bible
5. UX Bible
6. Learning Economy
7. User Personas
8. Business Operations
9. Technical Architecture
10. Security
11. AI Strategy
12. Analytics
13. Financial Model
14. Go-To-Market
15. Sales Playbook
16. Customer Success
17. Marketing
18. Engineering Handbook
19. Design System
20. API Documentation
21. Database Bible
22. Deployment & DevOps
23. Investor Relations
24. Future Vision

Each volume includes starter sections and one seeded version.

## Content Strategy

Atlas content is now seeded with Mosaico-specific operating guidance instead of placeholder text. The seed describes the current platform facts: React/FastAPI/Supabase/Render architecture, RBAC, Super Admin configuration, analytics, audit/activity logs, technical wiki, Mosaico Atlas, and launch blockers such as the credit ledger, production booking lifecycle, teacher availability backend, Google Calendar connection, tutor/student scoping, and E2E smoke coverage.

On backend startup, `_ensure_atlas_rich_content(...)` safely backfills Atlas sections:

- Creates any missing suggested sections for the 25 core volumes.
- Replaces old starter text that still says `Replace this starter content`.
- Preserves manually edited sections that no longer match the starter marker.
- Keeps volume metadata, tags, links, and suggested sections aligned with the Atlas seed.

The current identity/profile architecture belongs to Atlas Volume 7 (User
Personas), Volume 9 (Technical Architecture), Volume 10 (Security), Volume 20
(API Documentation), and Volume 21 (Database Bible). Its authoritative
implementation contract is `docs/PROFILE_MODEL.md`; Atlas editorial content
should link to that contract rather than restating profile fields or RBAC
rules.

The shared mobile workspace architecture belongs to Atlas Volume 5 (UX
Bible), Volume 9 (Technical Architecture), Volume 18 (Engineering Handbook),
and Volume 19 (Design System). Its authoritative implementation and review
contract is `docs/MOBILE_UX_AND_NAVIGATION_STANDARD.md`. Atlas content should
link to that contract rather than defining independent mobile sidebars or
action models.

## API

- `GET /api/admin/atlas`
- `GET /api/admin/atlas/search`
- `GET /api/admin/atlas/volumes/{slug}`
- `POST /api/admin/atlas/volumes`
- `PATCH /api/admin/atlas/volumes/{volume_id}`
- `POST /api/admin/atlas/volumes/{volume_id}/workflow`
- `POST /api/admin/atlas/volumes/{volume_id}/versions`
- `POST /api/admin/atlas/sections`
- `POST /api/admin/atlas/decisions`
- `POST /api/admin/atlas/glossary`
- `DELETE /api/admin/atlas/glossary/{term_id}`
- `PATCH /api/admin/atlas/settings`
- `GET /api/admin/atlas/export`

## Current Export Support

- Atlas index as JSON.
- Volume as JSON.
- Volume/index as Markdown.

PDF export is intentionally left as a future backend job because there is no existing connected PDF pipeline for the web app.

## Next Improvements

Teacher calendar integration decisions are documented in
`docs/GOOGLE_CALENDAR_INTEGRATION.md`: MOSAICO remains canonical, Calendar OAuth
is separate from login, event content is not imported, busy data only subtracts
availability, and MOSAICO events use deterministic identity. Future scheduling
and external-integration Atlas volumes should reference that contract.

- Rich Markdown editor with side-by-side preview.
- Version diff and restore UI.
- Attachment upload backed by Supabase Storage.
- Review assignment notifications.
- PDF export job.
- Cross-reference graph visualization.
