# MOSAICO Platform Roadmap

This roadmap moves MOSAICO from MVP/demo into a real education platform. The rule is to ship in safe phases: every phase must keep production healthy, leave the database more trustworthy, and turn one demo surface into real backed behavior.

## Product North Star

MOSAICO is a Spanish learning platform for clients, tutors/parents, teachers, and school administrators.

Core loops:

- Clients follow a roadmap, complete lessons/practice/tests, unlock badges and credits, and book live classes.
- Tutors/parents manage family learners, credits, progress, messages, and approvals.
- Teachers manage calendar, assigned students, materials, feedback, and evaluations.
- Administrative users approve users, grant credits, create/approve lessons, manage roles, and monitor school health.

## Phase 0: Stabilize Production Foundation

Status: in progress.

Goals:

- Keep Render production deployable.
- Keep authentication safe and persistent.
- Keep RBAC explicit and auditable.
- Start normalizing the database without breaking historical records.

Already shipped:

- Local email/password auth with persistent sessions.
- Social login remains primary.
- Multi-role RBAC with permission levels.
- Database catalog tables, `NOT VALID` relational guardrails, and backfill audit script.

Exit criteria:

- Production backend stays healthy after schema startup.
- Backfill audit can run without destructive changes.
- Admin can see roles/permissions and login can create a safe learner account.

## Phase 1: Real Identity, Profiles, And Access

Goal: make users, profiles, roles, and sessions production-grade.

Backend:

- Add profile tables/views for client, tutor/guardian, teacher, and administrative persona data.
- Add profile completion status.
- Add password reset/request flow.
- Add session management endpoints for current sessions and revoke all sessions.
- Add audit events for user creation, role assignment, login, logout, and admin changes.

Frontend:

- Convert `/login` into the canonical auth entry.
- Add first-run profile setup after registration.
- Hide protected portal functionality based on effective permissions.
- Add an admin user detail view showing profile, roles, sessions, and audit history.

Database:

- Run `backend/backfill_standardization_phase1.sql` in a controlled database session.
- Review orphan audit rows.
- Normalize legacy `users.role` values.
- Prepare but do not yet validate foreign keys until audit is clean.

Exit criteria:

- Every active user has a primary profile type and at least one role.
- New users cannot self-assign privileged roles.
- Admin can assign roles and review session/audit history.

## Phase 2: Learning Model Backend

Goal: turn the roadmap demo into real academic data.

Backend:

- Create academic model tables: levels, courses, units, lessons, activities, assessments, skills, outcomes.
- Create learner enrollment and progress tables.
- Add APIs for roadmap, current lesson, activity completion, test attempts, badges, and credit unlocks.
- Add idempotent progress events so activity completion can be audited.

Frontend:

- Replace roadmap mock data with API-backed data.
- Persist activity completion.
- Show locked/unlocked levels from backend state.
- Add practice test and checkpoint attempt flows.

Exit criteria:

- A client can enroll in a path, complete activities, earn a badge, and unlock credits from real backend state.

## Phase 3: Credits, Payments, And Booking Ledger

Goal: make credits and booking financially reliable.

Backend:

- Create credit ledger tables for grants, purchases, unlock rewards, usage, refunds, and adjustments.
- Convert booking credit usage into ledger entries.
- Separate booking relationships from commercial snapshots.
- Add admin credit grant approvals and audit history.

Frontend:

- Show client/tutor credit wallet from ledger.
- Admin credit grants become real API-backed actions.
- Booking uses credits or payment state consistently.

Exit criteria:

- Credit balance is derived from ledger entries, not manually stored numbers.
- Every credit movement has reason, actor, timestamp, and related entity.

## Phase 4: Teacher Operations

Goal: support real teacher workflows.

Current shipped surface:

- Teacher Calendar Workspace frontend with day/week/month views, availability creation, blocked time, empty-slot invites, Google Calendar sync states, scheduling insights, and class action drawers.
- Current implementation uses `frontend/src/services/teacherCalendarService.js` as a mock service so the workflow can be reviewed before backend schedule tables are introduced.

Backend:

- Normalize teacher availability, assigned students, teaching products, feedback, and class reports.
- Add teacher schedule APIs.
- Add feedback/evaluation APIs tied to bookings and learner skills.

Frontend:

- Teacher calendar becomes API-backed.
- Teacher feedback writes to learner progress.
- Teacher earnings/reporting uses real bookings.

Exit criteria:

- A teacher can manage assigned classes and submit feedback that appears in student/tutor portals.

## Phase 5: Admin Console And Governance

Goal: make the school principal workflow operational.

Backend:

- Add approvals workflow for users, teachers, lesson drafts, and credit adjustments.
- Add admin dashboards backed by queries.
- Add settings governance for session duration and school policies.

Frontend:

- Admin approvals, roles, credits, lessons, and reports become API-backed.
- Add filters, search, and detail pages for operational work.

Exit criteria:

- Administrative user can run daily operations without touching technical tools.

## Phase 6: Quality, Scale, And Observability

Goal: platform reliability.

Engineering:

- Add backend unit tests for auth, RBAC, credits, roadmap, and booking.
- Add frontend smoke tests for login and core portal routes.
- Add migration tooling such as Alembic.
- Add structured logs and operational health checks.
- Add data retention and privacy policy implementation.

Exit criteria:

- Releases have automated confidence checks.
- Production incidents can be diagnosed from logs and audits.

## Current Recommendation

Start with Phase 1. It is the foundation for everything else: real platform identity, profile ownership, session control, role-driven access, and auditability.

Immediate next tasks:

1. Add a backend audit event table and helper.
2. Log local registration, login, logout, and role changes into audit events.
3. Add session listing/revocation endpoints.
4. Add first-run profile completion fields.
5. Run the phase 1 database backfill in a controlled database session.

## Documentation And Wiki Rule

Every platform change must update existing documentation or create new documentation. Technical documentation is surfaced inside the product through the technical wiki at:

```text
/technical/wiki
```

This route is reserved for technical roles such as `administrador_sitio` or users with wildcard platform permission.
