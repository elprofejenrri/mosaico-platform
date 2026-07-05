# RBAC Admin Module

## Purpose

The RBAC Admin Module gives administrative users a governed way to manage roles, permissions, user assignments, and RBAC audit history from inside MOSAICO.

Primary route:

```text
/admin/roles-permissions
```

Compatibility route:

```text
/admin/roles
```

## Current Scope

Implemented in this phase:

- Role catalogue with system and custom roles.
- Additive multi-role user assignment.
- Dot-notation permission catalogue using `module.section.action`.
- Permissions matrix grouped by module and section.
- Critical permission confirmation flow in the UI and backend.
- User assignment tab with multi-role editing and bulk role assignment.
- User assignment rows show Save and Cancel only when the draft role set differs from the persisted roles.
- RBAC audit log tab.
- Backend endpoints under `/api/admin/rbac/*`.
- Server-side protections for required system roles and users without roles.

## System Roles

- `administrador_sitio` - Super Admin
- `administrador_profesor` - Admin
- `coordinador` - Coordinator
- `profesor` - Teacher
- `alumno` - Student
- `tutor_padre` - Tutor / Parent
- `viewer` - Viewer

Legacy roles such as `admin`, `teacher`, and `student` continue to normalize to the existing canonical role names.

## Permission Convention

New permissions use:

```text
module.section.action
```

Examples:

- `roles.management.view`
- `roles.permissions.modify`
- `users.roles.assign`
- `calendar.teacher.sync_google`
- `credits.wallet.refund`
- `audit.logs.view`

Legacy permissions such as `roles:manage` remain seeded so existing backend guards continue to work while the platform migrates route by route.

## Security Rules

- Users must always keep at least one role.
- System roles cannot be deleted.
- Super Admin cannot be deactivated.
- Custom role deletion is blocked if it would leave users without roles.
- A user cannot remove their own last admin access.
- Assigning Super Admin requires explicit confirmation.
- Critical permission changes require explicit confirmation.
- RBAC role, permission, and user-role changes are written to `audit_events`.

## Backend Endpoints

- `GET /api/admin/rbac/roles`
- `GET /api/admin/rbac/roles/{role_name}`
- `POST /api/admin/rbac/roles`
- `PATCH /api/admin/rbac/roles/{role_name}`
- `POST /api/admin/rbac/roles/{role_name}/duplicate`
- `PATCH /api/admin/rbac/roles/{role_name}/status`
- `DELETE /api/admin/rbac/roles/{role_name}`
- `GET /api/admin/rbac/permissions`
- `PATCH /api/admin/rbac/roles/{role_name}/permissions`
- `GET /api/admin/rbac/users`
- `PATCH /api/admin/rbac/users/{user_id}/roles`
- `POST /api/admin/rbac/users/bulk-roles`
- `GET /api/admin/rbac/audit-logs`

## Next Steps

- Move legacy guards from `roles:manage`, `users:manage`, and similar permissions to dot-notation permissions route by route.
- Add automated backend tests for protected role deletion, critical permission confirmation, and self-demotion prevention.
- Add per-route frontend guards using effective permissions from `/api/auth/me`.
- Add a richer role detail drawer with role-specific audit filters and user impact preview before permission saves.
