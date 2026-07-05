# Analytics and Observability

## Purpose

MOSAICO now has a first production analytics and observability layer. The goal is to help Super Admins understand platform usage, operational health, and product outcomes without relying on mock dashboard data.

## Data Tables

- `analytics_events`: product usage events such as dashboard views, bookings, credits, settings updates, and RBAC changes.
- `activity_logs`: operational timeline records for admins and scoped users.
- `audit_events`: sensitive immutable trail for security and governance.
- `error_events`: internal technical errors with request IDs.

## Analytics Events

The backend accepts a controlled catalog of events:

- `user_logged_in`
- `dashboard_viewed`
- `class_booked`
- `class_cancelled`
- `class_rescheduled`
- `class_completed`
- `feedback_added`
- `credits_purchased`
- `credits_granted`
- `credits_used`
- `availability_created`
- `availability_blocked`
- `invitation_sent`
- `student_profile_viewed`
- `teacher_profile_viewed`
- `calendar_synced`
- `role_assigned`
- `permission_modified`
- `settings_updated`
- `report_exported`

Every event should include module, entity type, entity ID, metadata, user, role, timestamp, and session ID when available.

## Backend Helpers

- `_record_analytics_event(...)`
- `_record_activity_log(...)`
- `_record_audit_event(...)`
- `_record_error_event(...)`

New business actions should call the helper instead of writing raw database rows.

## API Endpoints

- `POST /api/analytics/events`: authenticated client event ingestion.
- `GET /api/admin/analytics/overview`: Super Admin/Admin analytics dashboard data.
- `GET /api/admin/activity-logs`: paginated operational logs.
- `GET /api/admin/audit-logs`: paginated security logs.

## Error Standard

Backend errors return:

```json
{
  "code": "forbidden",
  "message": "Insufficient permissions",
  "details": {},
  "requestId": "req_...",
  "timestamp": "2026-07-05T00:00:00+00:00"
}
```

Every response also includes `X-Request-ID`. Internal server errors are persisted in `error_events` when the database is available.

## Frontend

- `frontend/src/lib/analytics.js` provides `trackEvent`.
- `frontend/src/lib/api.js` attaches request IDs and normalizes API errors as `error.appError`.
- `frontend/src/components/ErrorBoundary.jsx` prevents blank screens on UI crashes.
- `frontend/src/components/ActivityTimeline.jsx` is reusable for activity surfaces.
- `/admin/analytics` is the Super Admin analytics dashboard.

## Current Instrumented Events

- Local user login.
- Dashboard viewed.
- Class booked after successful payment.
- Credits purchased after successful payment.
- Availability created.
- Class cancelled, completed, or rescheduled through admin booking update.
- Role assignment.
- Permission modification.
- Platform settings update.

## Next Integrations

As each module becomes production-backed, connect:

- Feedback forms to `feedback_added`.
- Credit grants to `credits_granted`.
- Credit consumption to `credits_used`.
- Google Calendar sync to `calendar_synced`.
- Invitations to `invitation_sent`.
- Profile detail screens to profile viewed events.
- Report export buttons to `report_exported`.
