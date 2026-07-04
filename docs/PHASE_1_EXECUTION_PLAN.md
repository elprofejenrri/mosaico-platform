# Phase 1 Execution Plan: Identity, Profiles, And Access

## Objective

Make identity and access real enough for a production education platform while keeping production safe.

## Scope

In scope:

- Local and social auth hardening.
- Session management.
- Audit events.
- Profile ownership and completion.
- RBAC enforcement in backend and frontend.
- Database backfill/audit before constraint validation.

Out of scope:

- Full learning content backend.
- Full credit ledger.
- Full teacher payroll/earnings.
- Constraint validation against production before audit rows are clean.

## Workstream 1: Audit Events

Deliverables:

- `audit_events` table. Shipped.
- Backend helper for writing audit events. Shipped.
- Events for local registration, local login, logout, user updates, role assignment, and role permission changes. Shipped.

Acceptance:

- Admin can retrieve audit events for a user. Shipped via `GET /admin/users/{user_id}/audit-events`.
- Sensitive data such as passwords and raw tokens is never stored.

## Workstream 2: Sessions

Deliverables:

- `GET /auth/sessions`
- `POST /auth/sessions/revoke-all`
- `DELETE /auth/sessions/{session_id}`

Acceptance:

- User can see active local sessions.
- User can revoke all local sessions.
- Admin can inspect sessions for a user through an admin endpoint.

## Workstream 3: Profiles

Deliverables:

- Add profile completion fields to `student_profiles`.
- Add tutor/guardian profile table or account relationship table.
- Add APIs for current user profile.

Acceptance:

- A newly registered user lands in a first-run setup flow.
- Profile type remains controlled and non-privileged by default.

## Workstream 4: RBAC Enforcement

Deliverables:

- Backend permission checks for admin-only APIs continue using effective multi-role permissions.
- Frontend hides privileged actions when effective permissions are missing.
- Admin user detail screen shows roles and permissions.

Acceptance:

- A client cannot see or call privileged admin operations.
- Role changes are audited.

## Workstream 5: Database Backfill

Deliverables:

- Run `backend/backfill_standardization_phase1.sql` in a controlled session.
- Save audit output.
- Decide which constraints can be validated later.

Acceptance:

- No destructive cleanup happens without review.
- Any orphan records are documented before being fixed.

## Release Safety

Before every push:

- `python -m py_compile backend/server.py backend/database.py`
- `npm run build` when frontend changes
- `git diff --check`
- Verify `https://mosaico-api.onrender.com/api/`

Do not:

- Validate foreign keys in production until the audit is clean.
- Delete historical records automatically.
- Allow public registration to assign privileged roles.
