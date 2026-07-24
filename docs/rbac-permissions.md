# RBAC Permissions

## Model

- Every user must have at least one role.
- A user can have multiple roles.
- Role permissions are additive.
- Permissions have levels from view to govern.
- Backend permission checks are authoritative.
- Frontend hides unavailable navigation and actions as a UX layer only.

## Core Tables

- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `audit_events`

## Important Permissions

- `classes.sessions.view`
- `classes.sessions.create`
- `classes.sessions.edit`
- `learning.roadmaps.view`
- `learning.roadmaps.create`
- `learning.roadmaps.edit`
- `learning.roadmaps.publish`
- `users.profile.view`
- `users.profile.edit`
- `profiles.view`
- `profiles.update`
- `users.roles.assign`
- `roles.management.view`
- `roles.management.create`
- `roles.management.edit`
- `roles.management.delete`
- `roles.permissions.modify`
- `reports.analytics.view`
- `reports.analytics.export`
- `settings.platform.view`
- `settings.platform.edit`
- `audit.logs.view`
- `logs.activity.view`

## Safety Rules

- System roles cannot be deleted.
- Critical permission changes require confirmation.
- Assigning Super Admin requires confirmation.
- A user cannot remove their own last admin access.
- Users cannot be left with zero active roles.
- Permission enforcement must happen server-side for every sensitive endpoint.

## Admin UI

The main RBAC UI is `/admin/roles-permissions`. It supports role inspection, permission levels, user role assignment, safety prompts, and audit visibility.

## School Administrative Role

`administrador_escolar` is the non-technical education administrator role. It is meant for school principal workflows and has additive permissions for classes, learning roadmaps, student/teacher coordination, and school reports. It does not receive technical IAM, platform settings, audit, or system-health permissions by default.

## Technical documentation

`technical.wiki.view` is the dedicated permission for the restricted in-application
technical wiki. Navigation and route rendering require technical access, and the
backend applies the same rule to the allowlisted document responses. The protected
`administrador_sitio` role and wildcard technical access continue to satisfy this
permission.

The portal selector shows one active profile at a time through a dropdown. Users with multiple roles can switch between Client, Tutor, Teacher, School Administrative, and Technical Admin when their effective permissions allow those portals.

## Teacher Google Calendar

`calendar.teacher.sync_google` is a self-scoped teacher permission for connecting,
selecting calendars, synchronizing, disconnecting and retrying the current
teacher's assigned class events. Backend ownership is always derived from the
authenticated user and teacher/class records; client-supplied user, teacher,
calendar or school identity is never authoritative. Pending teachers may
connect after completing their profile, but class-event creation requires an
approved teacher profile.
