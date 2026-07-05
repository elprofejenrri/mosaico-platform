# Analytics Events

## Purpose

Analytics events measure product usage, business outcomes, and feature adoption.

## Table

`analytics_events`

## Event Contract

- `eventName`
- `userId`
- `role`
- `timestamp`
- `module`
- `entityType`
- `entityId`
- `metadata`
- `sessionId`

## Event Catalog

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

## API

Frontend event ingestion:

```http
POST /api/analytics/events
```

Admin analytics:

```http
GET /api/admin/analytics/overview
```

## UI

The analytics dashboard is available at `/admin/analytics`.
