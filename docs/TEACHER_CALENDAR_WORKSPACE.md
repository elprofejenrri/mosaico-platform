# Teacher Calendar Workspace

## Purpose

The Teacher Calendar Workspace is the operational scheduling surface for teachers. It replaces the earlier lightweight calendar mock with a workflow-oriented view where a teacher can manage availability, blocked time, upcoming classes, empty slots, student invitations, Google Calendar sync state, and session outcomes from one place.

## Current Scope

The frontend is implemented with a local service mock in `frontend/src/services/teacherCalendarService.js`. This lets product, UX, and stakeholder review continue before the backend scheduling tables and Google Calendar integration are finalized.

Implemented UI capabilities:

- Day, week, and month calendar views.
- Calendar navigation controls and primary actions for opening availability and blocking time.
- Slot states for booked, available, blocked, cancelled, completed, conflict, and empty gaps.
- Upcoming classes grouped into next class, today, and this week.
- Availability modal for one-time and recurring availability, capacity, location, copy Monday, duplication, bulk generation, and template selection.
- Block time modal with reason, date/time, recurrence, notes, and conflict summary.
- Empty slot panel with fill-rate opportunities and student invite entry points.
- Student invite drawer with filters, message preview, selected recipients, and bulk send behavior.
- Google Calendar connection card with connected/syncing/error states.
- Scheduling insights KPIs and action suggestions.
- Student quick view drawer with class actions: complete, cancel, no-show, late, reschedule, notes, homework, and feedback.
- Responsive desktop, tablet, and mobile layouts.
- Month view uses compact non-overflowing slot cards and stacks the operations sidebar below the calendar until wide desktop space is available.
- Day, week, and month views show a shared status legend and explicit empty-slot placeholders, so teachers can distinguish booked classes from available openings and unfilled gaps.
- The calendar is now the persistent center of the workspace. Google Calendar and scheduling insights open as lateral panels only when requested.
- The former fixed "Next class" and "Today's classes" side modules are replaced by action buttons that highlight the relevant class directly inside the calendar.
- This behavior is now the reference implementation for the platform-wide center workspace pattern documented in `docs/UX_INTERACTION_STANDARDS.md`.
- Availability is modeled as a time window, not only a single class slot. A window can expose 30, 45, and/or 60 minute class options and applies a configurable cooldown gap between generated options.

## Product Behavior

Teachers should be able to answer three questions quickly:

1. What is my next class and what do I need to do?
2. Where can I open or protect time?
3. Which open slots should I fill with student invitations?

The page is intentionally operational rather than promotional. It prioritizes compact controls, state visibility, and direct actions.

Availability behavior:

- Teachers open a window such as `09:00-11:00`.
- The window can support one or more class durations: 30, 45, and 60 minutes.
- The platform calculates possible bookable starts inside the window for each duration.
- Cooldown minutes are inserted after each possible class when calculating the next option.
- Example with no cooldown: `09:00-11:00` can show four 30-minute slots, two 45-minute slots, or two 60-minute slots.
- Example with 10-minute cooldown: each generated option reserves class time plus 10 minutes before the next possible start.

## Technical Design

Frontend entry point:

- `frontend/src/components/teacher-calendar/TeacherCalendarWorkspace.jsx`

Supporting service:

- `frontend/src/services/teacherCalendarService.js`

The workspace owns local view state and calls the mock service for calendar data and mutations. The service keeps mutable in-memory data for prototype-quality interactions while keeping the UI free from hardcoded class records.

The Teacher Portal renders this workspace for the calendar module from:

- `frontend/src/pages/Platform.jsx`

## Backend Backlog

Before this becomes a fully real scheduling platform, replace the mock service with backend-backed resources:

- `teacher_availability_windows`
- `teacher_availability_duration_options`
- `teacher_availability_generated_slots`
- `teacher_time_blocks`
- `class_sessions`
- `class_session_actions`
- `calendar_integrations`
- `student_invitation_campaigns`
- `student_invitation_recipients`

## Google Calendar Integration Requirements

The current Google Calendar card is a mock service. To make it real, MOSAICO needs:

- A Google Cloud project with the Google Calendar API enabled.
- OAuth consent screen configured for MOSAICO.
- OAuth client credentials for the production frontend/backend redirect URI.
- Backend OAuth endpoints to start connection, handle callback, store refresh tokens securely, disconnect, and refresh access tokens.
- Encrypted storage for calendar integration records and refresh tokens.
- Calendar sync tables for external event IDs, sync direction, last sync cursor/page token, conflicts, and error state.
- Backend worker or scheduled job for periodic sync.
- Webhook/channel renewal if using Google Calendar push notifications.
- Conflict policy for imported busy blocks versus MOSAICO booked classes.
- RBAC enforcement with `calendar.teacher.sync_google` before allowing connect, disconnect, or manual sync.
- Audit events for connect, disconnect, sync, conflict resolution, and permission failures.

Recommended implementation steps:

1. Add backend tables for `calendar_integrations`, `calendar_sync_events`, and `teacher_time_blocks`.
2. Add Google OAuth endpoints and store refresh tokens encrypted.
3. Replace `syncGoogleCalendar` in the frontend mock service with API calls.
4. Import Google busy events as blocked time, not as booked MOSAICO classes.
5. Export only confirmed MOSAICO classes when sync direction allows export.
6. Add conflict review UI before overwriting or moving any class.
7. Add automated tests for token refresh, permission checks, conflict creation, and disconnect behavior.

Recommended backend endpoints:

- `GET /api/teacher/calendar`
- `POST /api/teacher/availability`
- `PATCH /api/teacher/availability/{id}`
- `DELETE /api/teacher/availability/{id}`
- `POST /api/teacher/time-blocks`
- `PATCH /api/teacher/sessions/{id}`
- `POST /api/teacher/invitations`
- `POST /api/teacher/calendar-integrations/google/sync`

## Production Safety

This change is frontend-first and does not modify production data or schema. There is no database backfill required for the current implementation.

When the backend implementation starts, use additive migrations first, run backfill scripts separately, and keep Google Calendar sync opt-in until conflict handling has been tested with real records.
