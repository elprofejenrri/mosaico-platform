# Super Admin Configuration Center

## Purpose

The Super Admin Configuration Center is the production administration layer for sensitive platform operations. It gives technical and platform administrators one controlled place to review configuration, manage access surfaces, inspect logs, and verify system health.

## Routes

- `/admin/configuration`: platform configuration editor.
- `/admin/roles-permissions`: role and permission management.
- `/admin/audit-logs`: immutable sensitive-action audit trail.
- `/admin/activity-logs`: operational activity timeline.
- `/admin/system-settings`: system health and runtime status.

## Backend Endpoints

- `GET /api/admin/configuration/settings`
- `PATCH /api/admin/configuration/settings`
- `GET /api/admin/audit-logs`
- `GET /api/admin/activity-logs`
- `GET /api/admin/system-health`

All endpoints require authenticated users and server-side permissions. The frontend hides unavailable navigation items, but authorization is enforced by the API.

## Permissions

- `settings.platform.view`: view platform configuration and system health.
- `settings.platform.edit`: edit platform configuration.
- `audit.logs.view`: view security and administrative audit logs.
- `logs.activity.view`: view operational activity logs.
- `roles.management.view`: access roles and permissions.
- `users.profile.view`: access user administration.

Super Admin keeps wildcard access. Admin has operational visibility but does not receive unrestricted Super Admin override rights.

## Platform Settings

Settings are stored in `site_settings.platform_config` and merged with safe defaults at read time. Editable sections:

- General branding and support contact details.
- Feature flags.
- Booking rules.
- Credit rules.
- Cancellation policy.
- Teacher availability rules.
- Student scheduling rules.
- Notification settings.
- Default role assignment rules.

Validation blocks unsafe values such as invalid booking windows, unsupported class durations, invalid cooldowns, and unknown default roles.

## Audit Logs

Audit events are immutable records for sensitive changes. The schema supports:

- `actor_user_id`
- `actor_name`
- `action`
- `target_type`
- `target_id`
- `before_state`
- `after_state`
- `metadata`
- `ip_address`
- `user_agent`
- `risk_level`
- `created_at`

Platform configuration changes are logged with before and after state. Existing RBAC and authentication audit events continue to write to the same table.

## Activity Logs

Activity logs are operational records for product and support workflows. They are separate from audit logs because they can be user-facing and lower risk. Current implementation records platform setting updates and provides the persistence surface for future events such as bookings, credit movement, feedback, availability, and invitations.

## Security Notes

- Do not rely on hidden buttons for protection; all sensitive endpoints use `require_permission`.
- Configuration updates require `settings.platform.edit` at level 5.
- Audit log access requires `audit.logs.view`.
- Activity log access requires `logs.activity.view`.
- Protected RBAC rules remain in place for system roles and self-demotion safeguards.
- Sensitive changes should always call `_record_audit_event`.

## Operational Checklist

- Seed roles and permissions before inviting real admins.
- Confirm every Super Admin account has MFA/social login when that auth phase lands.
- Review audit logs after every production role or configuration change.
- Keep maintenance mode and environment badge accurate per deployment.
- Backfill `activity_logs` table during deployment if the database predates this release.
