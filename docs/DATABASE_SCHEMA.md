# Database Schema

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
- `active`

### `permissions`

Permission catalogue. Permissions are catalogued by functionality and level.

Important RBAC fields:

- `name`
- `label`
- `catalog`
- `feature`
- `action`
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

### `student_profiles`

Student profile data:

- phone
- enrolled products
- notes
- status

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
- `pages.content_blocks`

## Migration Strategy

Current migration style:

- `CREATE TABLE IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- idempotent catalog seed inserts
- idempotent `NOT VALID` foreign-key constraints for production-safe standardization
- startup-applied schema

This is pragmatic for the current deployment. For a larger team or higher-change production environment, consider adding a formal migration tool such as Alembic.
