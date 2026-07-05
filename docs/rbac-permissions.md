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

- `users.profile.view`
- `users.profile.edit`
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
