# MOSAICO Production Execution Plan

Date: 2026-07-05

## Strategy

Move from MVP to platform by converting one domain at a time from mock state to persisted, permissioned, audited workflows. Do not wire every mock button at once. The safe order is identity, academic model, credits, scheduling, then operational workflows.

## Current Implementation Note

The first production-safety pass is in place:

- Preview-only platform modules now show an in-app preview notice.
- Generic mock actions no longer present themselves as persisted success; they show preview feedback.
- Production-backed admin modules are identified separately from mock-backed modules.
- Frontend role checks prefer `user.roles` when present, avoiding stale legacy `user.role` access.
- Backend `/api/health` and `/api/version` endpoints support deployment verification.
- Production readiness docs are registered for the technical wiki.
- The teacher calendar mock remains intentionally isolated in `frontend/src/services/teacherCalendarService.js` with a backend TODO.

## Priority Backlog

### P0: Production Safety Foundation

Goal: prevent unsafe access, misleading production UI, and deployment blind spots.

1. Add production startup guards.
   - Fail backend startup if production has placeholder Supabase config or `DEV_AUTH=true`.
   - Fail frontend build/deploy if `REACT_APP_DEV_AUTH=true`.
   - Require explicit `CORS_ORIGINS`.

2. Add health and version endpoints.
   - `/api/health`: DB connectivity, schema version, storage config status without secrets.
   - `/api/version`: git commit/build timestamp if available.

3. Harden frontend access helpers.
   - Prefer `user.roles` over legacy `user.role` when roles are present.
   - Add frontend route smoke tests for student-only users.

4. Mark or hide mock-only production actions.
   - Replace high-risk `ActionButton` usage for credits, approvals, bookings, and lessons with disabled "not available yet" states until backend exists.
   - Keep demo screens visible only for technical/admin preview if needed.

5. Register production readiness docs in the technical wiki backend registry.

Acceptance:

- Student-only cannot see or open Teacher/Tutor/Admin.
- Production config cannot silently enable dev auth.
- Operators can verify deployed commit and service health.
- Mock financial/admin actions are not presented as real.

### P1: Identity, Profiles, Sessions

Goal: make real users and personas trustworthy.

Backend:

- Add profile completion fields or dedicated profile tables for client, tutor/guardian, teacher, and administrative profiles.
- Add session listing endpoint.
- Add revoke session and revoke-all-sessions endpoints.
- Add password reset request/confirm flow.
- Add audit events for profile changes and session revocations.
- Normalize role/permission response shape.

Frontend:

- Add first-run profile setup after registration.
- Add account/security page for sessions.
- Improve admin user detail with profile, roles, sessions, audit history.

Database:

- Add profile completion columns or profile tables.
- Consider `user_relationships` for tutor/student links.

Acceptance:

- Every active user has profile type, roles, profile completion state.
- Users can manage sessions.
- Admin can inspect user access and history without DB access.

### P2: Academic Learning Model

Goal: make student roadmap, lessons, activity completion, tests, badges, and unlocks real.

Backend models:

- `learning_levels`
- `courses`
- `course_units`
- `lessons`
- `lesson_activities`
- `skills`
- `learning_outcomes`
- `learner_enrollments`
- `learner_activity_events`
- `learner_progress_snapshots`
- `assessments`
- `assessment_questions`
- `assessment_attempts`
- `assessment_responses`
- `badges`
- `learner_badges`
- `reward_rules`
- `reward_events`

APIs:

- `GET /api/learn/roadmap`
- `GET /api/learn/courses`
- `GET /api/learn/lessons/{lesson_id}`
- `POST /api/learn/activities/{activity_id}/complete`
- `GET /api/learn/progress`
- `GET /api/learn/assessments`
- `POST /api/learn/assessments/{id}/attempts`
- `POST /api/learn/rewards/{reward_id}/claim`

Frontend:

- Replace `academicCourses`, `clientLearningPath`, `clientBadgeGallery`, `academicAssessments`, `academicProgress` with API data.
- Persist lesson/activity state.
- Lock/unlock roadmap from backend.
- Add real test/practice test attempt flow.

Acceptance:

- A learner can complete an activity, persist progress, earn a badge, and see it after refresh/login.

### P3: Credit Ledger and Booking Reliability

Goal: make credits auditable and safe.

Backend models:

- `credit_wallets`
- `credit_ledger_entries`
- `credit_grant_requests`
- `credit_packages`
- `booking_credit_holds`
- `refund_requests`

Rules:

- Balance is derived from ledger.
- Every movement has actor, reason, source, related entity, timestamp.
- Booking creates a hold, confirmation converts hold to usage, cancellation creates release/refund according to policy.

APIs:

- `GET /api/credits/wallet`
- `GET /api/credits/ledger`
- `POST /api/admin/credits/grants`
- `PATCH /api/admin/credits/grants/{id}/approve`
- `POST /api/bookings/{id}/use-credits`

Frontend:

- Replace tutor/admin credit local state with ledger-backed views.
- Add confirmations and error states for grants/refunds.
- Connect purchases to Stripe and ledger.

Acceptance:

- Credit balance survives refresh and matches ledger.
- Admin grants are audited.
- Booking cannot overdraft credits.

### P4: Scheduling and Teacher Calendar

Goal: replace `teacherCalendarService.js` with backend APIs.

Backend models:

- `teacher_availability_windows`
- `teacher_schedule_slots`
- `teacher_time_blocks`
- `calendar_integrations`
- `calendar_sync_events`
- `calendar_conflicts`
- `student_invitations`
- `class_feedback`
- `class_attendance_events`

Rules:

- Availability windows support 30/45/60 min duration options.
- Cooldown gaps are enforced.
- Slot generation prevents overlapping bookings/blocks.
- Booking claims must be atomic.
- Teacher Google Calendar integration is per teacher, not just admin settings.

APIs:

- `GET /api/teacher/calendar`
- `POST /api/teacher/availability-windows`
- `POST /api/teacher/time-blocks`
- `PATCH /api/teacher/classes/{booking_id}`
- `POST /api/teacher/invitations`
- `POST /api/teacher/calendar/sync`
- `POST /api/teacher/feedback`

Frontend:

- Replace mock service with API client.
- Keep current calendar UI but drive it from backend.
- Add real conflict resolution.
- Add confirmation for class cancellation/no-show.

Acceptance:

- Teacher opens a 9-11 window and backend exposes valid 30/45/60 minute options with cooldown.
- Student booking consumes one slot and blocks overlap.
- Teacher feedback appears in learner/tutor portals.

### P5: Tutor and Family Operations

Goal: make parent/tutor workflows real after academic and credit models exist.

Backend models:

- `family_accounts`
- `family_members`
- `guardian_student_relationships`
- `guardian_permissions`
- `messages`
- `notifications`
- `alert_instances`
- `progress_reports`

APIs:

- `GET /api/tutor/family`
- `GET /api/tutor/students`
- `GET /api/tutor/students/{id}/progress`
- `POST /api/tutor/messages`
- `PATCH /api/tutor/alerts/{id}/acknowledge`
- `POST /api/tutor/bookings`

Frontend:

- Replace `useTutorState` and tutor mock datasets.
- Add family account setup and student selector from backend.
- Add real messages and alerts.

Acceptance:

- Tutor can only see linked students.
- Tutor can allocate credits and book for linked student with audit.

### P6: Administrative Principal Workflow

Goal: make school operations usable without technical tools.

Backend models:

- `approval_requests`
- `lesson_drafts`
- `lesson_versions`
- `review_comments`
- `admin_tasks`
- `school_policies`
- `report_snapshots`

APIs:

- `GET /api/admin/approvals`
- `PATCH /api/admin/approvals/{id}`
- `GET /api/admin/lessons/drafts`
- `POST /api/admin/lessons`
- `PATCH /api/admin/lessons/{id}/review`
- `GET /api/admin/reports/school-health`
- `PATCH /api/admin/policies`

Frontend:

- Replace admin dashboard metrics, approvals, credits, lessons, families, reports, settings mock screens.
- Merge legacy admin CRUD into the new admin shell.
- Retire or hide `/legacy-admin` when equivalent modules exist.

Acceptance:

- Administrative user can approve users/teachers/lessons, grant credits, and monitor school health without DB access.

### P7: Quality, Observability, and Scale

Backend:

- Add unit tests for auth, RBAC, sessions, credit ledger, schedule generation, booking holds, Stripe webhooks.
- Add API integration tests with test DB fixtures.
- Add Alembic or equivalent migration tooling.
- Add structured logs and request IDs.
- Add security headers and rate limiting.

Frontend:

- Add Playwright smoke tests for login, protected portals, RBAC, booking, learning activity completion.
- Add accessibility checks for forms/modals/tables.
- Add visual checks for calendar desktop/mobile.

CI/CD:

- Run backend tests, frontend build, lint, dependency audit on PR.
- Add deploy verification script for health/version/bundle commit.

Acceptance:

- Releases have automated confidence checks before production.
- Operators can diagnose failures from logs and health/version endpoints.

## Technical Execution Sequence

1. Safety patch.
   - Add health/version endpoints.
   - Add production config guard.
   - Harden frontend access helper.
   - Register audit docs in technical wiki.

2. Documentation and UI truthfulness.
   - Label or hide mock-only actions.
   - Add a `MockStatus` or feature flag for demo modules.
   - Update technical wiki.

3. Database migration foundation.
   - Run backfill audit.
   - Clean legacy role/profile values.
   - Validate safe constraints.
   - Introduce migration tool before adding academic tables.

4. Academic domain.
   - Create schema and seed first learning path.
   - Add read APIs.
   - Wire Student Learning Hub/Roadmap read state.
   - Add progress writes.

5. Credits domain.
   - Create ledger and wallet APIs.
   - Wire Student/Tutor/Admin credit displays and grants.

6. Scheduling domain.
   - Create teacher availability/block/slot APIs.
   - Replace teacher calendar mock service.
   - Add conflict and cooldown tests.

7. Family/admin workflows.
   - Add family relationships and admin approvals.
   - Replace tutor/admin mocks.

## Risk List

P0 risks:

- Users may believe mock success toasts changed real data.
- Dev auth could be accidentally enabled by placeholder config.
- Credit/admin approval buttons currently simulate critical actions.
- Missing health/version endpoints makes deploy verification weak.

P1 risks:

- Legacy role fields can diverge from RBAC assignments.
- LocalStorage token storage increases impact of XSS.
- Lack of rate limiting makes auth endpoints brute-forceable.

P2 risks:

- Academic progress without idempotent events can double-award XP/credits.
- Badges and credit unlocks need transactional boundaries.

P3 risks:

- Credit balances are financially sensitive; avoid mutable balance columns as source of truth.
- Booking and credit usage need atomic transactions.

P4 risks:

- Calendar sync can create duplicate or conflicting events.
- Per-teacher OAuth token storage requires encryption and rotation policy.

## Validation Plan

For every module promoted from mock to production:

- Backend unit tests for domain rules.
- API tests for happy path, forbidden path, validation errors, and idempotency.
- Frontend smoke test for the user workflow.
- RBAC test for unauthorized persona.
- Audit event assertion for sensitive mutation.
- Documentation update.

## Deployment Readiness Checklist

Before production deploy:

- `git status --short` clean except intended files.
- Backend syntax/tests pass.
- Frontend build passes.
- No frontend tests missing silently in CI.
- Environment variables complete and non-placeholder.
- `DEV_AUTH=false` and `REACT_APP_DEV_AUTH=false`.
- `CORS_ORIGINS` set to production frontend only plus approved local/dev origins.
- `/api/health` returns healthy.
- `/api/version` matches pushed commit.
- Render backend and frontend deploy latest commit.
- Smoke test:
  - Login.
  - Student cannot open Teacher/Tutor/Admin.
  - Admin can open RBAC.
  - RBAC user role save/cancel works.
  - Public home/pricing/blog load.
  - Booking checkout still creates Stripe session in configured environment.
- Backfill audit reviewed before validating constraints.
- Rollback commit or Render rollback target identified.

## Definition of Done for "Production-Ready"

A module is production-ready only when:

- Data persists in backend and survives refresh/login.
- Backend enforces ownership and permissions.
- Input validation exists server-side.
- Frontend has loading, success, error, empty, and confirmation states.
- Sensitive actions write audit events.
- Tests cover happy path and forbidden path.
- Documentation and technical wiki are updated.
- Mock data for that module is removed or only used as seed/test fixture.
