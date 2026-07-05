# Admin Guide

## Purpose

Admins operate the school side of MOSAICO. They manage users, credits, lessons, teachers, bookings, reports, analytics, and support issues.

## Key Routes

- `/admin`: overview.
- `/admin/iam`: Identity & Access Management for users, roles, permissions, sessions, and audit history.
- `/admin/users`: compatibility entry into IAM users.
- `/admin/roles-permissions`: compatibility entry into IAM permissions.
- `/admin/configuration`: Super Admin configuration center.
- `/admin/analytics`: product analytics.
- `/admin/audit-logs`: sensitive audit trail.
- `/admin/activity-logs`: operational activity timeline.
- `/admin/system-settings`: system health.

## Daily Operations

1. Review analytics and recent activity.
2. Review pending users, credits, lessons, and bookings.
3. Check teacher calendar health and empty slots.
4. Resolve support requests.
5. Review audit logs after sensitive changes.

## Critical Actions

Role assignment, permission changes, credit changes, settings changes, cancellations, and data exports should be confirmed, logged, and reviewed.

## Known Gaps

Some admin modules still contain preview-only flows. They are marked in product documentation and should not be treated as production source of truth until backed by APIs and database models.
