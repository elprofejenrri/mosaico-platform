-- MOSAICO database standardization phase 1 backfill.
-- Safe to run multiple times. It normalizes known legacy values and reports
-- records that must be reviewed before validating NOT VALID constraints.

BEGIN;

-- Normalize legacy role/profile/provider values.
UPDATE users SET role = 'alumno' WHERE role = 'student';
UPDATE users SET role = 'administrador_sitio' WHERE role = 'admin';
UPDATE users SET role = 'profesor' WHERE role = 'teacher';
UPDATE users SET auth_provider = 'supabase' WHERE auth_provider IS NULL OR auth_provider = '';
UPDATE users SET profile_type = 'client' WHERE profile_type IS NULL OR profile_type = '';

-- Normalize common booking/payment/page values into existing catalogs.
UPDATE bookings SET status = 'confirmed' WHERE status IS NULL OR status = '';
UPDATE payment_transactions SET payment_status = 'initiated' WHERE payment_status IS NULL OR payment_status = '';
UPDATE payment_transactions SET status = 'open' WHERE status IS NULL OR status = '';
UPDATE student_profiles SET status = 'activo' WHERE status IS NULL OR status = '';
UPDATE pages SET language = 'es' WHERE language IS NULL OR language = '';
UPDATE pages SET status = 'draft' WHERE status IS NULL OR status = '';
UPDATE media_assets SET type = 'file' WHERE type IS NULL OR type = '';
UPDATE login_history SET provider = 'google' WHERE provider IS NULL OR provider = '';

-- Ensure every user's primary role exists in the multi-role join table.
INSERT INTO user_roles (id, user_id, role_name, active, assigned_by, created_at, updated_at)
SELECT
    'ur_backfill_' || md5(u.user_id || ':' || u.role),
    u.user_id,
    u.role,
    TRUE,
    'phase1-backfill',
    now()::TEXT,
    now()::TEXT
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.user_id AND ur.role_name = u.role
);

COMMIT;

-- Review queries. These should return zero rows before validating constraints.
SELECT 'users.role missing role catalog' AS check_name, user_id AS record_id, role AS value
FROM users
WHERE role NOT IN (SELECT name FROM roles);

SELECT 'users.auth_provider missing catalog' AS check_name, user_id AS record_id, auth_provider AS value
FROM users
WHERE auth_provider NOT IN (SELECT code FROM auth_providers);

SELECT 'users.profile_type missing catalog' AS check_name, user_id AS record_id, profile_type AS value
FROM users
WHERE profile_type NOT IN (SELECT code FROM user_profile_types);

SELECT 'bookings.user_id orphan' AS check_name, id AS record_id, user_id AS value
FROM bookings
WHERE user_id NOT IN (SELECT user_id FROM users);

SELECT 'bookings.product_id orphan' AS check_name, id AS record_id, product_id AS value
FROM bookings
WHERE product_id NOT IN (SELECT id FROM products);

SELECT 'bookings.teacher_id orphan' AS check_name, id AS record_id, teacher_id AS value
FROM bookings
WHERE teacher_id IS NOT NULL AND teacher_id NOT IN (SELECT id FROM teachers);

SELECT 'bookings.status missing catalog' AS check_name, id AS record_id, status AS value
FROM bookings
WHERE status NOT IN (SELECT code FROM booking_statuses);

SELECT 'role_permissions.role_name orphan' AS check_name, id AS record_id, role_name AS value
FROM role_permissions
WHERE role_name NOT IN (SELECT name FROM roles);

SELECT 'role_permissions.permission orphan' AS check_name, id AS record_id, permission AS value
FROM role_permissions
WHERE permission NOT IN (SELECT name FROM permissions);

SELECT 'user_roles.user_id orphan' AS check_name, id AS record_id, user_id AS value
FROM user_roles
WHERE user_id NOT IN (SELECT user_id FROM users);

SELECT 'user_roles.role_name orphan' AS check_name, id AS record_id, role_name AS value
FROM user_roles
WHERE role_name NOT IN (SELECT name FROM roles);
