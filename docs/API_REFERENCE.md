# API Reference

Base URL:

```text
Local:      http://localhost:8002/api
Production: https://mosaico-api.onrender.com/api
```

Authenticated requests use:

```http
Authorization: Bearer <supabase_access_token_or_mosaico_local_token>
```

Social login remains the preferred login path through Supabase Auth. Local email/password accounts use MOSAICO-issued opaque session tokens.

## Public

### GET `/`

Health check.

Response:

```json
{"app":"Lily Spanish","ok":true}
```

### GET `/settings/public`

Returns public site settings.

## Auth

### POST `/auth/register`

Creates a local email/password account, creates a learner profile, assigns the default `alumno` role, and returns a persistent session token.

Body:

```json
{"name":"Ana Gomez","email":"ana@example.com","password":"strong-password","profile_type":"client"}
```

### POST `/auth/login`

Logs in a local email/password user and returns a persistent session token.

Body:

```json
{"email":"ana@example.com","password":"strong-password"}
```

### GET `/auth/me`

Returns the authenticated user, effective roles, and effective permission levels.

### POST `/auth/logout`

Revokes the current local session token when present and signs the user out client-side.

### GET `/products`

Lists public products.

### GET `/products/{product_id}`

Gets one product by id.

### GET `/availability`

Query parameters:

- `date`
- `teacher_id`

### GET `/blog`

Lists published blog posts.

### GET `/blog/{slug}`

Gets a blog post by slug.

### GET `/teachers`

Lists active teachers.

## Auth

### GET `/auth/me`

Returns the current authenticated internal user.

Creates or updates the internal user from Supabase Auth if needed.

### POST `/auth/logout`

Returns `{ "ok": true }`.

Frontend also signs out from Supabase.

## Student

### GET `/bookings/me`

Lists bookings for the current user.

## Payments

### POST `/payments/checkout`

Creates Stripe Checkout session.

Requires:

- authenticated user
- configured Stripe key

### POST `/payments/webhook`

Stripe webhook endpoint.

## Admin: Dashboard

### GET `/admin/stats`

Returns counts for:

- users
- active students
- active teachers
- products
- bookings
- upcoming classes
- published pages
- revenue placeholder
- recent bookings

## Admin: Users And Roles

### GET `/admin/users`

Lists users with booking counts and assigned roles.

### PATCH `/admin/users/{user_id}`

Updates:

- name
- role
- picture
- active

### DELETE `/admin/users/{user_id}`

Deletes user unless it is the current user.

### GET `/admin/roles`

Lists roles, permissions, and permission levels.

### GET `/admin/rbac/catalog`

Lists RBAC levels, role catalogue, and permission catalogue grouped by functionality.

Requires `roles:manage`.

### RBAC Admin Module

The real RBAC administration surface uses `/admin/rbac/*` endpoints. These endpoints enforce dot-notation permissions server-side while legacy RBAC endpoints remain available for compatibility.

- `GET /admin/rbac/roles` requires `roles.management.view`
- `GET /admin/rbac/roles/{role_name}` requires `roles.management.view`
- `POST /admin/rbac/roles` requires `roles.management.create`
- `PATCH /admin/rbac/roles/{role_name}` requires `roles.management.edit`
- `POST /admin/rbac/roles/{role_name}/duplicate` requires `roles.management.create`
- `PATCH /admin/rbac/roles/{role_name}/status` requires `roles.management.edit`
- `DELETE /admin/rbac/roles/{role_name}` requires `roles.management.delete`
- `GET /admin/rbac/permissions` requires `roles.management.view`
- `PATCH /admin/rbac/roles/{role_name}/permissions` requires `roles.permissions.modify`
- `GET /admin/rbac/users` requires `users.profile.view`
- `PATCH /admin/rbac/users/{user_id}/roles` requires `users.roles.assign`
- `POST /admin/rbac/users/bulk-roles` requires `users.roles.assign`
- `GET /admin/rbac/audit-logs` requires `audit.logs.view`

Safety behavior:

- System roles cannot be deleted.
- Super Admin cannot be deactivated.
- Critical permission changes require `confirmCritical: true`.
- Assigning Super Admin requires `confirmPrivileged: true`.
- User-role changes that leave a user without roles are rejected.
- Users cannot remove their own last admin access.

### PATCH `/admin/roles/{role_name}/permissions`

Updates the permission level assignments for a role.

Requires `roles:manage`.

### PATCH `/admin/users/{user_id}/roles`

Assigns multiple roles to one user and updates the primary `users.role` to the highest-level role.

Requires `roles:manage`.

### GET `/admin/users/{user_id}/login-history`

Lists login history for a user.

### GET `/admin/users/{user_id}/audit-events`

Lists platform audit events for a user, newest first.

## Technical Wiki

### GET `/technical/docs`

Lists allowlisted technical documentation available in the in-product technical wiki.

Requires technical access.

### GET `/technical/docs/{doc_id}`

Returns one allowlisted technical document with Markdown content for in-product rendering.

Requires technical access.

## Admin: Teachers

### GET `/admin/teachers`

Lists all teachers.

### POST `/admin/teachers`

Creates teacher.

### PATCH `/admin/teachers/{teacher_id}`

Updates teacher fields.

### DELETE `/admin/teachers/{teacher_id}`

Deletes teacher.

## Admin: Products

### POST `/admin/products`

Creates product.

### PATCH `/admin/products/{product_id}`

Updates product.

### DELETE `/admin/products/{product_id}`

Deletes product.

## Admin: Availability

### POST `/admin/availability`

Creates available slot.

### DELETE `/admin/availability/{slot_id}`

Deletes slot.

## Admin: Bookings

### GET `/admin/bookings`

Lists all bookings.

### PATCH `/admin/bookings/{booking_id}`

Updates:

- status
- meeting_link
- notes

## Admin: Students

### GET `/admin/students`

Lists student users and booking counts.

### GET `/admin/student-profiles`

Lists student profiles.

### POST `/admin/student-profiles`

Creates student profile.

### PATCH `/admin/student-profiles/{profile_id}`

Updates student profile.

## Admin: CMS Pages

### GET `/admin/pages`

Optional query parameters:

- `language`
- `status`

### POST `/admin/pages`

Creates page.

### PATCH `/admin/pages/{page_id}`

Updates page.

### POST `/admin/pages/{page_id}/duplicate`

Duplicates page as draft.

### DELETE `/admin/pages/{page_id}`

Archives page.

## Admin: Blog

### GET `/admin/blog`

Lists all blog posts.

### POST `/admin/blog`

Creates blog post.

### PATCH `/admin/blog/{slug}`

Updates blog post.

### DELETE `/admin/blog/{slug}`

Deletes blog post.

## Admin: Media

### GET `/admin/media`

Lists media assets.

### POST `/admin/media`

Creates media asset record.

### PATCH `/admin/media/{media_id}`

Updates media asset.

### DELETE `/admin/media/{media_id}`

Deletes media asset.

## Admin: Uploads

### POST `/admin/upload`

Uploads image to Supabase Storage.

Allowed types:

- JPEG
- PNG
- WebP
- GIF

Max size:

```text
5 MB
```

### GET `/files/{path}`

Serves uploaded files through backend if recorded in `files`.

## Admin: Settings

### GET `/admin/settings`

Returns full settings document.

### PATCH `/admin/settings`

Updates settings.

### POST `/admin/settings/test-gcal`

Sends a Google Calendar test invite if calendar settings are configured.
