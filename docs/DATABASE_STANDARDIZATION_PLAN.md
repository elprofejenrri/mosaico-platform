# Database Standardization Plan

MOSAICO is moving from an MVP-friendly flat schema toward a normalized relational model.

## Phase 1: Safe Relational Guardrails

Implemented in `backend/schema.sql`:

- Catalog tables for bounded values such as auth providers, profile types, product types, booking statuses, payment statuses, page statuses, media types, and languages.
- Foreign keys for key relationships such as users to roles, bookings to users/products/teachers, role permissions to roles/permissions, and sessions/login history to users.
- Supporting indexes for foreign-key and filter columns.
- Constraints are created as `NOT VALID` to avoid breaking production on historical records while still protecting new rows.

## Phase 2: Backfill And Validate

Next work:

- Normalize legacy values such as `users.role = 'student'` to `alumno`.
- Audit orphan records before validating constraints:
  - bookings without users/products/teachers
  - user roles without users/roles
  - role permissions without permissions
  - sessions/login history without users
- Run `ALTER TABLE ... VALIDATE CONSTRAINT ...` after data is clean.

## Phase 3: Reduce Duplication

Separate true relationships from historical snapshots:

- Keep `bookings.user_id`, `product_id`, and `teacher_id` as relational references.
- Move commercial snapshot fields such as `user_email`, `user_name`, `product_name`, `duration_min`, and `teacher_name` into a clearly named booking snapshot or invoice snapshot model.
- Normalize `teacher_profiles.specialties`, `teacher_profiles.assigned_products`, and `student_profiles.enrolled_products` into join tables.

## Phase 4: Typed Dates And Migrations

Replace text-based dates over time:

- `created_at`, `updated_at`, `last_login_at`, `expires_at`, `revoked_at`, `last_seen_at` -> `TIMESTAMPTZ`
- `scheduled_date` -> `DATE`
- `scheduled_time`, `end_time` -> `TIME`

For this phase, adopt a formal migration tool such as Alembic instead of only startup-applied schema.
