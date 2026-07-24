# Database Schema

## Production Notes

The schema is defined in `backend/schema.sql` and applied on backend startup. It is written to be idempotent with `CREATE TABLE IF NOT EXISTS`, additive `ALTER TABLE`, and safe indexes.

Current production platform tables include:

- Identity and access: `auth_identities`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `local_auth_sessions`, `login_history`.
- Education commerce: `products`, `payment_transactions`, `bookings`, `availability`, `teachers`, `teacher_profiles`, `student_profiles`.
- Teacher calendar integration: `external_calendar_connections`, `external_calendar_selections`, `external_busy_blocks`, `calendar_event_links`, `google_calendar_oauth_states`.
- Content: `pages`, `blog_posts`, `media_assets`, `files`, `site_settings`.
- Operations: `audit_events`, `activity_logs`, `analytics_events`, `error_events`.

Before launch, add ledger-grade credit tables and tutor/student relationship tables.

The authoritative schema is:

```text
backend/schema.sql
```

The backend applies this schema on startup.

## Core Tables

### `users`

Internal user catalogue synchronized from Supabase Auth.

Important fields:

- `user_id`
- `google_id`
- `email`
- `name`
- `picture`
- `role`
- `password_hash`
- `auth_provider`
- `profile_type`
- `active`
- `created_at`
- `updated_at`
- `last_login_at`
- `email_normalized`
- `auth_provider_user_id`
- account and suspension state fields

### `auth_identities`

Verified provider-to-user mappings. `(provider, provider_user_id)` is unique.
Provider tokens and secrets are never stored here.

### `local_auth_sessions`

Opaque session tokens for MOSAICO local email/password login. Tokens are stored as hashes and expire through `expires_at`.

Important fields:

- `user_id`
- `token_hash`
- `expires_at`
- `revoked_at`
- `last_seen_at`

### `roles`

Role catalogue.

Important RBAC fields:

- `name`
- `label`
- `description`
- `level`
- `type`
- `status`
- `active`

### `permissions`

Permission catalogue. Permissions are catalogued by functionality and level.

Important RBAC fields:

- `name`
- `label`
- `catalog`
- `module`
- `section`
- `feature`
- `action`
- `risk_level`
- `level`
- `active`

### `role_permissions`

Relationship between roles and permissions.

Important RBAC fields:

- `role_name`
- `permission`
- `level`
- `scope`

### `user_roles`

Relationship between users and roles.

Users can have multiple active roles. The app keeps `users.role` as the primary role for backward compatibility and syncs it into `user_roles`.

### Catalog Tables

The schema now includes first-pass catalog tables for controlled values:

- `auth_providers`
- `user_profile_types`
- `product_types`
- `language_catalog`
- `booking_statuses`
- `payment_statuses`
- `checkout_statuses`
- `student_profile_statuses`
- `page_statuses`
- `media_types`
- `login_providers`

These tables replace unbounded string values over time. Current constraints are added with `NOT VALID` so production can deploy safely before historical data is fully backfilled and validated.

### `teachers`

Teacher records used by public teacher lists, products, availability, and bookings.

### `teacher_profiles`

Optional profile relationship between an authenticated user and a teacher identity.
It also stores professional biography, taught languages, authorized levels,
modalities, experience, and the bounded teacher approval state.

### `student_profiles`

Student profile data:

- phone
- enrolled products
- notes
- status
- native and learning languages
- self-reported and operational levels
- learning goal, class format, and general availability

### `user_profiles`

Canonical shared profile data, one row per authenticated user:

- first and last name
- public name and picture
- native and learning language
- country, timezone, and phone
- validated JSON preferences

### `user_role_profiles`

Validated persona extension, unique by `(user_id, role_code)`. `profile_data`
contains only the allow-listed fields for that persona. `approval_status` is
authoritative for teachers; approval is never accepted by the self-service
profile endpoint.

The additive production migration is
`backend/migrations/003_user_profiles.sql`.

### `tutor_profiles`

Minimal tutor context, unique per user. Student relationships remain exclusively
in `tutor_student_links` and are never created automatically.

### `onboarding_states`

Versioned resumable onboarding state, unique by user/type/version. It stores
step identifiers and completion state, not duplicated personal profile data.

Migration `backend/migrations/005_identity_profile_onboarding.sql` adds the
definitive identity/profile/onboarding foundation. Run
`backend/audit_identity_profile_onboarding.py` before applying it to an
existing database; the script emits aggregate counts only.

### `products`

Learning products/classes/packages.

Important fields:

- `id`
- `slug`
- `name_en`
- `name_es`
- `description_en`
- `description_es`
- `duration_min`
- `sessions_included`
- `price_usd`
- `currency`
- `type`
- `teacher_id`
- `capacity`
- `active`
- `image`
- `language`
- `popular`

### `availability`

Available teaching slots.

### `bookings`

Class reservations connecting:

- student user
- product
- teacher
- date/time
- status

### Google Calendar integration tables

- `external_calendar_connections`: one optional Google connection per user;
  credentials are encrypted before persistence and excluded from API DTOs.
- `external_calendar_selections`: free/busy calendars and at most one owned
  destination calendar per connection.
- `external_busy_blocks`: normalized UTC intervals with fetch/expiry metadata;
  no event content.
- `calendar_event_links`: idempotent MOSAICO class-to-Google-event relation and
  synchronization state.
- `google_calendar_oauth_states`: expiring nonce hashes consumed atomically once.

Migration `backend/migrations/004_google_calendar_teacher_integration.sql` is
additive and performs no account connection, data inference, or historical
event creation.

### `payment_transactions`

Stripe checkout/payment tracking.

### `blog_posts`

Public blog/CMS article records.

### `pages`

CMS pages for public site content.

### `media_assets`

Media library records.

### `files`

Uploaded files tracked after Supabase Storage upload.

### `site_settings`

JSON document for site/admin configurable settings.

### `login_history`

Login audit records.

### `audit_events`

Platform audit trail for security and administrative changes.

Important fields:

- `actor_user_id`
- `target_user_id`
- `event_type`
- `entity_type`
- `entity_id`
- `metadata`
- `created_at`

## JSONB Fields

The database layer encodes and decodes JSONB fields for:

- `teachers.languages`
- `teachers.specialties`
- `teachers.availability`
- `payment_transactions.metadata`
- `teacher_profiles.specialties`
- `teacher_profiles.assigned_products`
- `student_profiles.enrolled_products`
- `external_calendar_connections.granted_scopes`
- `pages.content_blocks`

## Migration Strategy

Current migration style:

- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- idempotent catalog seed inserts
- idempotent `NOT VALID` foreign-key constraints for production-safe standardization
- startup-applied schema

This is pragmatic for the current deployment. For a larger team or higher-change production environment, consider adding a formal migration tool such as Alembic.
