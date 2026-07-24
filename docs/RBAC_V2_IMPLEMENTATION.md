# MOSAICO RBAC v2

## Architecture diagnosis

MOSAICO is a React 19 SPA built with CRACO, a FastAPI backend, and Supabase
PostgreSQL/Auth/Storage. The backend uses `asyncpg` through a small
Mongo-compatible collection adapter. Authentication supports Supabase OAuth and
local hashed sessions. Before RBAC v2, the repository already had roles,
permissions, role-permission links, multi-role users, FastAPI dependencies, an
IAM workspace, and audit events.

The important gaps were:

- most seeded permissions used `global` regardless of persona;
- role assignments had no school, status, or expiration;
- tutor and teacher relationships were not modeled explicitly;
- administrative list endpoints fetched global records;
- payment status was readable by an unauthenticated caller with a session ID;
- permission administration did not preserve scope;
- the six MVP roles did not include Finance as a stable system role;
- denied authorization decisions did not capture permission, result, reason,
  school, or request ID.

RBAC v2 extends those structures instead of replacing authentication or the
existing admin workspace.

## Stable roles

| Code | Internal compatibility key | Default scope |
|---|---|---|
| `ADMIN` | `administrador_sitio` | global |
| `STUDENT` | `alumno` | self |
| `STUDENT_TUTOR` | `tutor_padre` | linked |
| `TEACHER` | `profesor` | assigned |
| `SCHOOL_ADMIN` | `administrador_escolar` | school |
| `FINANCE` | `finanzas` | multi_school |

The six roles are system and protected roles. Admón retains the `*` permission
at global scope and cannot be deleted, deactivated, self-removed, or removed
from the final active administrator.

## Data model

RBAC v2 adds or extends:

- `roles`: stable `code`, scope, system/protected flags;
- `permissions`: stable `code` and system flag;
- `role_permissions`: `allowed`, `scope`, and JSON conditions;
- `user_roles`: school, assignment status, assigner, assignment time, expiry;
- `schools`;
- `user_school_memberships`;
- `tutor_student_links`;
- `teacher_student_assignments`;
- `bookings.school_id`;
- `payment_transactions.school_id` and refund state;
- `credit_movements`, an append-only idempotent ledger;
- `audit_events`: role, school, permission, result, denial reason, request ID.

The full repeatable schema is `backend/schema.sql`. Controlled upgrades can run
`backend/migrations/002_rbac_v2.sql`. The migration does not delete business
records.

## Authorization service

`backend/rbac_policy.py` is the framework-independent source of truth for:

- six stable role definitions;
- canonical permission catalog;
- default role/permission/scope matrix;
- scope evaluation for self, linked, assigned, school, multi-school, global;
- deny-by-default permission evaluation.

`backend/server.py` integrates the policy with persisted roles, grants,
memberships, links, assignments, active state, expiry, audit, and FastAPI.
`can(...)` evaluates verified context and `authorize(...)` stops the request
with HTTP 403 and records relevant denials. Anonymous calls remain HTTP 401.

The backend never treats `schoolId`, owner IDs, or roles supplied by the
frontend as authority. Resource and relationship records are loaded before
scope evaluation.

## Canonical permission matrix

The complete machine-readable matrix is `ROLE_GRANTS` in
`backend/rbac_policy.py`. It covers:

- dashboards;
- users, students, tutors, teachers;
- schedules, bookings, classes;
- academic content;
- credits and payments;
- academic and financial reports;
- settings;
- roles and permissions;
- audit.

Key separation rules:

- students: self only;
- tutors: verified active links only;
- teachers: verified active assignments only;
- school administrators: assigned schools only;
- finance: assigned schools only and no academic mutation grants;
- Admón: global.

## API

New or hardened endpoints:

- `GET /api/auth/me/permissions`
- `GET /api/admin/users/{user_id}/effective-permissions` — Admón only
- `GET /api/admin/rbac/schools`
- `GET /api/finance/payments`
- `GET /api/audit` — global, school, or finance-filtered audit scope
- `PATCH /api/finance/payments/{session_id}/{confirm|reject|refund}`
- `GET /api/finance/credits/{account_user_id}/movements`
- `POST /api/finance/credits/{account_user_id}/movements`
- `GET /api/payments/status/{session_id}` now requires authentication and scope
- administrative booking, student, and user lists now query within scope
- booking mutations now validate action and resource scope
- role mutations and permission changes are restricted to global Admón

Refunds require a reason, explicit confirmation, an original Stripe payment,
and a stable idempotency key. Credit movements require a reason and unique
transaction ID and record before/after balances.

## Frontend

- `usePermissions` exposes `can`, `cannot`, and effective scopes.
- `PermissionGate` and `ProtectedRoute` are reusable authorization UI controls.
- the global navigation is generated from effective portal access;
- the app loads `/auth/me/permissions` after authentication;
- IAM permission editing includes scope selection;
- IAM user role assignment displays school, assigner, assignment time, and
  optional expiration;
- `/finance` provides a permission-aware financial workspace.

Frontend controls improve UX but never replace backend authorization.

## Test data

In local/test only:

```powershell
$env:MOSAICO_ENV='test'
$env:RBAC_TEST_PASSWORD='choose-a-local-test-password'
python backend/seed_rbac_test_data.py
```

This creates the six requested test identities plus an out-of-scope student in
Escuela B. It creates two schools, memberships, a tutor link, teacher
assignment, and own/foreign bookings. The script refuses production
environments.

## Validation

Read-only integrity validation:

```powershell
python backend/validate_rbac.py
```

Safe repair preview and explicit application:

```powershell
python backend/repair_rbac.py
python backend/repair_rbac.py --apply
```

Unit tests and build:

```powershell
python -m pytest backend/tests/test_rbac_policy.py backend/tests/test_super_admin_configuration.py -q
cd frontend
npm run build
```

Current local result: 33 focused backend tests passed, 2 frontend tests
passed, Python compilation and focused flake8 checks passed, and the optimized
frontend production build compiled successfully.

Integration tests require a running API and configured database. When the API
is deliberately absent, those tests report skipped instead of a false product
failure.

## Verification queries

```sql
-- Effective assignments with schools
SELECT u.email, r.code, ur.school_id, ur.status, ur.assigned_by, ur.expires_at
FROM user_roles ur
JOIN users u ON u.user_id = ur.user_id
JOIN roles r ON r.name = ur.role_name
ORDER BY u.email, r.code, ur.school_id;

-- Permission scopes by role
SELECT r.code AS role_code, rp.permission, rp.scope, rp.allowed
FROM role_permissions rp
JOIN roles r ON r.name = rp.role_name
WHERE rp.level > 0
ORDER BY r.code, rp.permission;

-- Orphan assignments (must return zero rows)
SELECT ur.*
FROM user_roles ur
LEFT JOIN users u ON u.user_id = ur.user_id
LEFT JOIN roles r ON r.name = ur.role_name
WHERE u.user_id IS NULL OR r.name IS NULL;

-- Denied access evidence
SELECT actor_user_id, school_id, permission_code, entity_type, entity_id,
       denial_reason, request_id, created_at
FROM audit_events
WHERE result = 'denied'
ORDER BY created_at DESC;

-- Financial ledger completeness
SELECT *
FROM credit_movements
WHERE actor_user_id IS NULL OR school_id IS NULL OR reason = ''
   OR transaction_id IS NULL;
```

## Deployment order

1. Wait for the Supabase project to become healthy.
2. Back up the production database.
3. Apply `002_rbac_v2.sql` or deploy the backend, which auto-applies
   `schema.sql`.
4. Deploy the backend before the frontend.
5. Run `validate_rbac.py`.
6. Assign schools to non-global roles.
7. Exercise each persona with local/test fixtures before production identities.

## Remaining deployment risk

The live Supabase project shown during implementation was still “Coming up”.
Therefore the migration, test fixture seed, database validator, and authenticated
integration/E2E flows could not be executed against that external database.
No production data was modified. Unit policy tests and the production frontend
build are locally verifiable; database and live-role evidence must be completed
after Supabase is available.
