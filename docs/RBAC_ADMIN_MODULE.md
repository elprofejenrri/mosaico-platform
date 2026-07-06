# Identity & Access Management Module

## Purpose

The Identity & Access Management (IAM) module gives administrative users a governed way to manage users, roles, permissions, user assignments, login history, and access audit history from inside MOSAICO.

Primary route:

```text
/admin/iam
```

Compatibility routes:

```text
/admin/users
/admin/roles
/admin/roles-permissions
```

## Current Scope

Implemented in this phase:

- Role catalogue with system and custom roles.
- Additive multi-role user assignment.
- Dot-notation permission catalogue using `module.section.action`.
- Permissions matrix grouped by module and section.
- Critical permission confirmation flow in the UI and backend.
- Scalable IAM users table with role chips instead of inline role checkboxes.
- Users view uses a responsive grid/list instead of a wide table, prioritizing User, Access, Status, Activity, and Actions to avoid horizontal scroll.
- IAM follows the platform center workspace pattern from `docs/UX_INTERACTION_STANDARDS.md`: the users list remains central while user detail, roles, permissions, sessions, and audit history open in a drawer.
- Debounced search, filters, sorting, pagination, density control, and active filter chips.
- User detail drawer with General, Roles, Effective Permissions, Activity, Audit History, Login Sessions, and Notes sections.
- Role assignment happens from the drawer or bulk role modal.
- Bulk role assign, remove, and replace actions through `/api/admin/rbac/users/bulk-roles`.
- IAM audit log tab.
- Invitation and export actions are visible but disabled until backend invite/export services exist.

## Administrative Access Clarification

Student permissions such as dashboard, progress, credits view, or purchasing credits are not administrative powers. The RBAC UI treats these as learning/self-service permissions.

Administrative access is shown only when the user has permissions in sensitive areas such as roles, users, settings, audit logs, reports, credit grants/refunds, teacher profile edits, or student credit modifications.

## Portal Access Rules

The platform shell enforces RBAC access per portal, not only in the role switcher. This means a user cannot bypass the UI by typing a protected portal URL directly.

- Student/client portal is available to authenticated learning users.
- Tutor portal requires `tutor_padre`, `administrador_sitio`, `administrador_profesor`, or `coordinador`.
- Teacher portal requires `profesor`, `administrador_sitio`, `administrador_profesor`, `coordinador`, or the `calendar.teacher.view` permission.
- Admin portal requires an administrative role or sensitive administrative permission such as role, user, report, or platform management access.

Student-only users can keep their learning permissions without receiving Teacher, Tutor, or Admin workspace access.

Role assignments in `user_roles` are the source of truth once active assignments exist for a user. The legacy `users.role` column remains a fallback for unmigrated users only, so stale primary-role values cannot silently grant Teacher, Tutor, or Admin access.
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
