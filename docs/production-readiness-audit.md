# MOSAICO Production Readiness Audit

Date: 2026-07-05

## Executive Summary

MOSAICO has a real production foundation, but the education platform experience is still mixed between production-backed modules and advanced mockups.

Production-backed today:

- Public product, teacher, availability, blog, booking, payment, media, settings, user, RBAC, audit, login history, and technical docs APIs.
- Local email/password auth, Supabase Google auth, persistent local sessions, RBAC roles and permission levels.
- Admin legacy console and newer RBAC workspace.
- Technical wiki route with backend-protected documentation access.

Mostly mock/demo today:

- Student learning roadmap, lessons, activities, XP, tests, badges, AI tutor, community, progress, and credit unlocks.
- Tutor/parent family account, student switching, credit assignment, messages, alerts, badges, reports, tests, and bookings.
- Teacher dashboard, students, classes, materials, evaluations, earnings, and most teacher calendar actions.
- Administrative principal workflow for approvals, credit grants, lesson review, families, reports, and school setup.

The highest production risk is product truthfulness: many buttons show success toasts or mutate local state but do not persist or enforce business rules. The highest architecture gap is the missing academic/ledger/schedule/messaging domain model.

Current mitigation:

- Preview-only portal modules now show an in-app preview notice.
- Generic mock actions show preview feedback instead of claiming persisted success.
- The teacher calendar remains isolated in a named preview service with a backend TODO.
- Admin user management and RBAC are treated as production-backed modules.
- Backend health/version endpoints are available for deployment checks.

## Repository Map

Frontend:

- `frontend/src/App.js`: route registry for public, legacy admin, platform portals, auth, booking, and technical wiki.
- `frontend/src/pages/Platform.jsx`: main portal shell plus student, tutor, teacher, and admin mock/product screens.
- `frontend/src/data/platformMock.js`: primary mock dataset for learning, tutor, teacher, admin, RBAC demo, credits, badges, reports, messages, and roadmap.
- `frontend/src/components/teacher-calendar/TeacherCalendarWorkspace.jsx`: full UI for teacher scheduling, currently backed by mock service.
- `frontend/src/services/teacherCalendarService.js`: in-memory teacher calendar service with artificial delay.
- `frontend/src/components/admin-rbac/AdminRbacWorkspace.jsx`: production-backed RBAC admin workspace.
- `frontend/src/pages/Admin.jsx`: legacy production-backed admin console.
- `frontend/src/pages/Login.jsx`, `AuthCallback.jsx`: auth flows.
- `frontend/src/pages/TechnicalWiki.jsx`: technical wiki UI.

Backend:

- `backend/server.py`: FastAPI app, auth, RBAC, seed data, CMS, bookings, Stripe, Google Calendar, settings, technical docs, student profiles.
- `backend/database.py`: lightweight collection abstraction over PostgreSQL.
- `backend/schema.sql`: idempotent schema with catalog tables and `NOT VALID` relational constraints.
- `backend/backfill_standardization_phase1.sql`: safe backfill/audit helper.
- `backend/tests/test_lily_api.py`: integration-style tests requiring external tokens.

Documentation:

- `docs/PLATFORM_ROADMAP.md`: strongest current roadmap.
- `docs/DATABASE_STANDARDIZATION_PLAN.md`, `docs/DATABASE_SCHEMA.md`: schema normalization status.
- `docs/RBAC_ADMIN_MODULE.md`: RBAC behavior.
- `docs/TEACHER_CALENDAR_WORKSPACE.md`: teacher calendar product surface.
- `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/ENVIRONMENT_VARIABLES.md`: platform docs.

## Module-by-Module Audit

### Public Website

Status: Partially production-ready.

Production-backed:

- Home, pricing, blog, blog detail, teacher list, product list, availability strip.
- CMS/admin can manage products, teachers, blog, pages, media, settings.

Gaps:

- Some public content still comes from static i18n defaults if settings are missing.
- Published CMS pages exist in backend, but routing/rendering of dynamic pages is incomplete.
- Error states often fail silently on public reads.
- No SEO validation or canonical metadata pipeline.

Production action:

- Add dynamic CMS page renderer.
- Add public loading/error/empty states.
- Add content publishing preview and audit trail.

### Authentication and Sessions

Status: Functional but needs hardening.

Production-backed:

- Local email/password registration and login.
- Persistent local sessions stored as hashed tokens in `local_auth_sessions`.
- Session duration configured by `LOCAL_AUTH_SESSION_MINUTES`.
- Supabase Google OAuth remains supported.
- Login/logout audit and history exist.

Gaps:

- No password reset flow.
- No session list/revoke-all endpoint for users/admins.
- Local auth tokens are stored in `localStorage`, increasing XSS impact.
- Password policy is basic and not centrally documented.
- `DEV_AUTH` can create local admin if enabled or if placeholder Supabase JWT config is present.

Production action:

- Add password reset, session management, and stricter password policy.
- Move local sessions toward HttpOnly secure cookies or add a documented token hardening plan.
- Add startup guard preventing dev auth in production.

### RBAC and Route Protection

Status: Partially production-ready and recently improved.

Production-backed:

- Role catalog, permission catalog, role_permissions, user_roles.
- Multiple roles per user.
- Permission levels.
- RBAC admin UI with critical confirmations and audit log.
- Portal shell blocks unauthorized portal routes.
- Backend admin/RBAC endpoints use `require_admin` or `require_permission`.

Gaps:

- Frontend `hasAnyRole` still considers both `user.role` and `user.roles`; backend now prefers `user_roles`, but frontend can show access if an API response carries stale `role`.
- Some legacy admin routes still use broad `require_admin`.
- Permission naming is mixed between legacy colon format (`roles:manage`) and newer dot format (`roles.management.view`).
- No automated RBAC regression tests.

Production action:

- Standardize permission naming and response shape.
- Make frontend access helpers prefer `roles` when present.
- Add test matrix for student/tutor/teacher/admin.

### Student/Client Portal

Status: Mostly mockup.

Mock-only or local-state screens:

- Dashboard metrics, weekly activity, recommended courses.
- Learning Hub: course, unit, lesson, activity completion, XP.
- Roadmap: stages, badges, unlock credits, tests/practice tests.
- Live Classes: teacher cards, book/reschedule buttons.
- AI Tutor: canned local response, no AI API, no persistence.
- Community: feed, likes, comments, event joins.
- Progress: skills, badges, certificates, history.

Buttons with non-persistent behavior:

- Continue course, Start/Mark complete activity, Claim unlocks, Start test, Practice.
- Book class, Reschedule.
- AI Tutor Send.
- Like, Comment, Join event.
- Share badge.

Backend persistence missing:

- Learning levels, courses, units, lessons, activities.
- Enrollments, lesson progress, XP, streaks.
- Assessments, attempts, scoring, test locks.
- Badges, rewards, credit unlock events.
- AI tutor conversation history and model integration.
- Community posts, comments, reactions, event registrations.

Production action:

- Implement academic model first, then progress events, then rewards/credits.

### Tutor/Parent Portal

Status: Mockup.

Mock-only or local-state screens:

- Family account and selected student state.
- Student profiles, risk, progress, weekly minutes, test history.
- Credit buying and assignment.
- Booking on behalf of student.
- Messages, alerts, badges, payments.

Buttons with non-persistent behavior:

- Save action, alert CTA, Buy credits, Confirm assignment.
- Book class for student.
- Copy/share/download report.
- View recommendation, send message, acknowledge alert, share badge, view invoice.

Backend persistence missing:

- Family/guardian account model.
- Tutor-to-student relationships and permissions.
- Shared wallet and child wallet ledger.
- Parent-controlled bookings.
- Teacher/tutor messaging.
- Alerts/notifications.
- Guardian-visible progress reports.

Production action:

- Add family account and guardian relationship model after student academic model.
- Back credit operations with ledger before enabling tutor credit UI.

### Teacher Portal

Status: UI prototype with one advanced mock service.

Mock-only or local-state screens:

- Dashboard metrics and student risk alerts.
- Students, classes, materials, evaluations, earnings.
- Teacher calendar workspace service.

Teacher Calendar specifics:

- `TeacherCalendarWorkspace.jsx` has good UX states: booked, available, empty, blocked, cancelled, completed, conflict.
- `teacherCalendarService.js` uses in-memory arrays and `setTimeout`-style delays.
- Google Calendar card is mock in frontend service, despite backend having real admin-level Google Calendar test/event creation.

Buttons with non-persistent behavior:

- Open availability, Block time, Sync now, Connect/Disconnect Google Calendar.
- Invite students, share/close slot, waitlist campaign.
- Complete/cancel/reschedule/no-show/late class actions.
- Message, homework, open profile.
- Share material, save evaluation, send follow-up.

Backend persistence missing:

- Teacher schedule windows with duration options and cooldown policy.
- Availability slot generation/reservation.
- Calendar blocks and recurrence.
- Teacher-owned Google OAuth integration.
- Conflict detection and sync jobs.
- Student invitations/waitlist.
- Feedback/evaluation tied to bookings and learner skills.
- Teacher materials and earnings ledger.

Production action:

- Build schedule domain and APIs before wiring calendar UI to backend.
- Keep Google Calendar off until teacher-level OAuth and token storage are designed.

### Administrative Portal

Status: Mixed.

Production-backed:

- `/admin/users` in `Platform.jsx` reads real users/roles and audit/login history.
- `/admin/roles-permissions` uses real RBAC module.
- Legacy `/legacy-admin` has real CRUD for teachers, products, blog, bookings, users, settings, CMS pages, media, roles.

Mock-only screens in new admin portal:

- Dashboard metrics.
- Approvals.
- Credits.
- Lessons/course review.
- Teachers approval workflow.
- Families.
- Reports.
- School setup.

Buttons with non-persistent behavior:

- Review approvals, Give credits, Create lesson.
- Approve/request info/schedule review.
- Grant credits.
- Approve teacher/review feedback.
- Create/approve/edit/request lesson changes.
- View account/schedule follow-up.
- Save school setup.

Backend persistence missing:

- Approvals queue.
- Credit grant workflow and ledger.
- Lesson drafts, review status, approval history.
- Family account management.
- Operational reporting queries.
- Administrative policy settings.

Production action:

- Decide whether to retire legacy admin route or merge it into new admin portal module-by-module.

### Booking, Payments, Availability

Status: Partially production-ready.

Production-backed:

- Products, teachers, availability, bookings, Stripe checkout, payment status, Stripe webhook.
- Booking creation after payment success.
- Optional backend Google Calendar event creation after booking.

Gaps:

- Credit booking path is not production-backed.
- Booking status is still string-heavy.
- Availability model is too flat for teacher windows, duration options, cooldown, capacity, and recurrence.
- No double-booking/slot reservation lock visible in app-level logic.
- Stripe tests assume configured real Stripe and external auth tokens.

Production action:

- Normalize scheduling and credit ledger before exposing production class booking beyond current checkout flow.

### CMS and Media

Status: Partially production-ready.

Production-backed:

- Blog CRUD, pages CRUD, media asset CRUD, file upload to Supabase Storage.
- Public settings/content overrides.

Gaps:

- Secret settings can be stored in `site_settings` JSON; this increases blast radius compared with environment-only secrets.
- Media delete is soft for files but not necessarily storage lifecycle complete.
- Dynamic page rendering incomplete.
- No content validation schema for blocks.

Production action:

- Split secret config from editable public/admin config.
- Add block schema validation and preview.

### Technical Wiki

Status: Good foundation.

Production-backed:

- `/technical/wiki` is frontend-protected and backend `/technical/docs` requires technical role.
- Docs are browsable inside platform.

Gaps:

- Technical wiki route may show static section list before backend load.
- No doc version history or edit workflow.
- New audit documents need to be registered in `TECHNICAL_DOCS` to appear via backend docs list.

Production action:

- Add these production readiness docs to technical docs registry in a future code change.

## Mock Data Inventory

Primary mock source: `frontend/src/data/platformMock.js`.

Mock domains:

- Platform stats and pillars.
- Teachers, courses, academic levels/courses/progress/assessments.
- Client roadmap and badge gallery.
- Bookings, students, community posts, events, skill progress.
- Analytics/payments.
- Teacher materials and availability.
- Tutor profile, learning account, tutor students, credits, tests, feedback, messages, alerts, badges, payments.
- School admin metrics/profile/approval queue/credit grants/lesson drafts/family accounts/reports.
- Demo RBAC roles/users/catalogs.

Secondary mock source: `frontend/src/services/teacherCalendarService.js`.

Mock domains:

- Teacher sessions, empty slots, students, calendar integration, scheduling insights.
- Availability save, block time, class updates, invitations, Google sync.

## Button and Action Audit

Pattern: `ActionButton` in `Platform.jsx` is now disabled unless it receives a real action handler. Any remaining use of `ActionButton` without `onAction` should be treated as non-production until replaced with API call, loading state, error handling, and audit where needed.

High-risk local mutations for tutor credit purchase, tutor credit assignment, tutor class booking, and administrative credit grants are also blocked until the credit ledger and booking lifecycle exist.

High-risk simulated actions:

- Claim unlocks/credits.
- Book/reschedule/cancel/complete/no-show classes.
- Grant credits.
- Approve users/teachers/lessons.
- Save school setup.
- Send teacher/tutor messages.
- Share/download reports.
- AI Tutor response.
- Google Calendar connect/sync from teacher workspace.

Production-backed action patterns:

- `AdminRbacWorkspace.jsx`: real API calls with loading/error/confirmation.
- `AdminUsersReal` in `Platform.jsx`: real user/role/status/history APIs, but less mature than RBAC workspace.
- Legacy `Admin.jsx`: real CRUD, but many catches are silent and UX is utilitarian.

## Data Model Gap Analysis

Missing or incomplete models:

- Academic: levels, courses, units, lessons, activities, learning outcomes, CEFR mapping, skills.
- Enrollment: learner path enrollment, course enrollment, assigned teacher/tutor visibility.
- Progress: activity completion, XP, streaks, skill evidence, progress events.
- Assessments: tests, practice tests, questions, attempts, scoring, rubrics, retakes.
- Badges/rewards: badge definitions, earned badges, reward rules, credit unlocks.
- Credits: ledger entries, wallets, grants, purchases, usage, refunds, adjustments, approval status.
- Family: learning accounts, guardians, student relationships, guardian permissions.
- Teacher schedule: availability windows, generated slots, duration options, cooldown, recurrence, blocks, conflicts.
- Calendar integration: per-teacher OAuth tokens, sync state, imported busy events, exported events, webhook/sync jobs.
- Messaging: teacher/tutor/admin messages, templates, read receipts.
- Alerts/notifications: alert rules, instances, acknowledgement.
- Lesson authoring: drafts, review workflow, approvals, versioning, publish state.
- Reporting: materialized/reporting queries for attendance, completion, feedback, utilization, revenue.
- AI tutor: conversation, prompt policy, usage, feedback, safety flags.

Existing but too flat:

- `availability`: only date/start/teacher/available.
- `bookings`: mixes relational IDs with commercial/user snapshots.
- `student_profiles`: profile fields are minimal; enrolled products stored as JSONB.
- `teacher_profiles`: specialties and assigned products stored as JSONB.
- `site_settings`: holds heterogeneous public settings, integration config, and potentially secrets.

## UX Gap Analysis

Strengths:

- Visual language is coherent across new platform screens.
- Calendar states are much clearer than earlier MVP.
- RBAC workspace has practical admin affordances.
- New portal layout supports role separation.

Gaps:

- Many flows show success without persistence, which can mislead users.
- Mock screens do not always mark themselves as demo.
- Student/tutor/teacher work areas lack detail pages and edit workflows.
- Critical actions need confirmation and reversible/error states.
- Empty, error, loading states are inconsistent outside RBAC/calendar.
- Legacy admin and new admin duplicate functionality with different UX.
- Some copy uses dummy/placeholder wording in user-facing screens.
- Wide tables need mobile alternatives.
- Calendar date navigation changes labels but not data range.

UX production requirements:

- Every action needs loading, success, error, and post-action state.
- Destructive/financial/role/calendar actions need confirmation.
- Read-only mock sections should be hidden or labeled until wired.
- Add drill-down pages for users, learners, bookings, lessons, and credits.
- Replace success-only toasts with state changes from backend responses.

## Security Gap Analysis

High priority:

- Dev auth is enabled automatically when Supabase JWT secret is placeholder. Production must fail closed if placeholder config is present.
- Local auth tokens in `localStorage` increase XSS blast radius.
- CORS defaults to `*` if `CORS_ORIGINS` is missing while credentials are enabled.
- Admin settings can store Stripe and Google secrets in database JSON.
- No rate limiting on login/register/payment/admin mutation endpoints.
- No CSRF strategy if cookies are introduced later.
- File upload validates MIME/size but should also validate extension/content and scan if possible.
- RBAC and route guards need automated regression tests.

Medium priority:

- Audit events exist but are not comprehensive across all admin/financial/content mutations.
- Some admin endpoints use broad `require_admin` instead of specific permissions.
- Permission naming is split between legacy and new conventions.
- Foreign keys are `NOT VALID`; historical bad data may still exist.
- Dynamic docs file serving must stay allowlisted only.

Lower priority:

- No structured security headers documented for Render/static frontend.
- No dependency vulnerability scan workflow documented.
- No PII retention/deletion policy implementation.

## Testing Gap Analysis

Current:

- Backend has integration-style pytest tests in `backend/tests/test_lily_api.py`.
- Tests require live service and external Supabase tokens for authenticated coverage.
- Frontend has no test files; `npm test` exits with no tests unless `--passWithNoTests`.

Missing:

- Unit tests for auth helpers, RBAC permission resolution, local sessions, role source-of-truth.
- API tests with isolated test database.
- Frontend smoke tests for route protection and portal access.
- Playwright tests for login, booking, RBAC, admin user role assignment, teacher calendar.
- Contract tests for key API responses.
- Stripe webhook tests.
- Calendar integration tests with mocked Google API.
- Accessibility checks for major forms/tables/modals.
- Visual regression for calendar and admin tables.

## Deployment Readiness

Current:

- Render blueprint exists for API and static web.
- Environment docs exist.
- Backend schema auto-applies on startup.
- Production URL docs exist.

Gaps:

- Health/version endpoints now exist, but deploy verification automation still needs to call them.
- No migration tool; startup schema changes are convenient but risky as schema grows.
- No deploy status verification automation.
- No rollback runbook beyond general docs.
- Render web recently lagged behind pushed commits during verification, so deploy observability needs attention.
- No CI pipeline shown for build/test/security checks before merge.

## Roadmap Implementation Status

Phase 0: In progress/mostly done.

- Auth, RBAC, database guardrails, docs, technical wiki exist.
- Backfill/constraint validation still pending.

Phase 1: Partially done.

- User roles, audit, login history, local auth exist.
- Missing profile completion, password reset, session management, user detail depth.

Phase 2: Not implemented.

- Learning model remains mock.

Phase 3: Not implemented.

- Credit ledger, wallet, grants, purchases, refunds, usage are mock/partial payment only.

Phase 4: Not implemented.

- Teacher operations are mostly mock. Existing teacher calendar is frontend-first.

Phase 5: Not implemented.

- Principal/admin workflows are mostly mock except users/RBAC and legacy CRUD.

Phase 6: Not implemented.

- Testing, observability, migrations, health checks, security automation are incomplete.

## Production Unsafe Areas

Do not present as production-complete until wired and tested:

- Student learning roadmap and rewards.
- Tutor credits and booking on behalf of students.
- Teacher calendar sync and schedule mutations.
- Admin credit grants, approvals, lesson review, reports, school setup.
- AI Tutor.
- Community.
- Teacher earnings.

Production-ready with hardening:

- Auth/login.
- RBAC admin.
- Legacy admin CRUD.
- Product/teacher/blog/media/settings CRUD.
- Stripe checkout.
- Technical wiki.
