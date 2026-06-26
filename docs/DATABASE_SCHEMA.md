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
- `active`
- `created_at`
- `updated_at`
- `last_login_at`

### `roles`

Role catalogue.

### `permissions`

Permission catalogue.

### `role_permissions`

Relationship between roles and permissions.

### `user_roles`

Relationship between users and roles.

The app currently stores primary role on `users.role` and also syncs into `user_roles`.

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
- startup-applied schema

This is pragmatic for the current deployment. For a larger team or higher-change production environment, consider adding a formal migration tool such as Alembic.

