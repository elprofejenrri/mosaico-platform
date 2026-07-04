# MOSAICO Product Documentation

## Overview

MOSAICO is a bilingual web platform for private online Spanish lessons. It combines a public marketing site, Google-based authentication, booking and payment flows, and an administrative platform for managing the education business.

The application is designed for:

- Students who want to browse products, book classes, pay, and view their bookings.
- Teachers who need visibility into assigned classes and students.
- Editors who manage public content, blog posts, pages, and media.
- Administrators who manage users, products, teachers, bookings, settings, and operations.

Default UI language is Spanish-ready, with public content structured for Spanish and English.

## Core Capabilities

### Public Website

- Home page
- Pricing page
- FAQ page
- Blog listing
- Blog post detail
- Booking entry points
- Bilingual content support
- Responsive layout for desktop, tablet, and mobile

### Authentication

- Supabase Auth with Google OAuth
- OAuth callback at `/auth/callback`
- Session persistence in the browser
- Backend user synchronization after login
- Automatic internal user creation on first login
- Admin promotion by email through `ADMIN_EMAILS`

### Administration Platform

The admin platform is available at:

```text
/admin
```

Current admin modules:

- Dashboard summary cards
- Users catalogue
- Roles view
- Availability management
- Teacher management
- Product/class management
- CMS pages
- Blog CMS
- Media library
- Public content settings
- Site/payment/calendar settings
- Booking management

### Teacher Portal

The teacher portal includes an operational calendar workspace for reviewing and managing teaching time.

Current teacher calendar capabilities:

- Day, week, and month calendar views.
- Booked, available, blocked, cancelled, completed, conflict, and empty slot states.
- Availability opening flow.
- Block time flow with reason and conflict summary.
- Upcoming classes panel.
- Empty slot invite flow for students.
- Google Calendar sync status card.
- Scheduling insights and fill-rate suggestions.
- Student quick view with class actions, notes, homework, and feedback.

The current teacher calendar is frontend-first and backed by a local mock service until the scheduling backend is implemented.

### Booking System

Bookings connect:

- Student user
- Product
- Teacher
- Date and time
- Status
- Optional meeting link
- Notes

Supported statuses include:

- `scheduled`
- `confirmed`
- `completed`
- `cancelled`
- `no-show`

### Product Management

Products represent the learning inventory sold or offered by MOSAICO:

- Free trial
- Single class
- Package
- Course
- Subscription

Product fields include:

- Title/name in English and Spanish
- Description in English and Spanish
- Price
- Currency
- Duration
- Sessions included
- Product type
- Assigned teacher
- Capacity
- Active/inactive
- Image
- Language

### CMS

CMS content includes:

- Pages
- Blog posts
- Media assets
- Site settings
- Public homepage/content blocks

Pages support:

- Title
- Slug
- Language
- Status: draft, published, archived
- SEO metadata
- Content blocks
- Hero image
- Created/updated by
- Published date

Blog posts support:

- Slug
- Titles in English and Spanish
- Excerpts in English and Spanish
- Body content in English and Spanish
- Cover image
- Published toggle

### Media Library

The media library stores records for media assets:

- File name
- URL
- Type
- Alt text
- Uploaded by
- Created/updated timestamps

When Supabase Storage is configured, admin upload endpoints store images in the configured bucket.

## Roles And Access

MOSAICO uses role-based access control.

Required roles:

- `administrador_sitio`
- `administrador_profesor`
- `profesor`
- `editor_cms`
- `alumno`

Legacy roles are normalized:

- `admin` maps to `administrador_sitio`
- `student` maps to `alumno`

Role capabilities:

| Role | Access |
| --- | --- |
| `administrador_sitio` | Full platform access |
| `administrador_profesor` | Manage teachers, students, products, bookings, availability |
| `profesor` | Teacher-oriented visibility, assigned-class permissions scaffold |
| `editor_cms` | CMS pages, blog, media, public content |
| `alumno` | Own dashboard/bookings |

Admin access is granted automatically when a Google-authenticated user's email appears in:

```env
ADMIN_EMAILS=admin@example.com
```

For multiple admins:

```env
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## Key User Flows

### Student Login

1. User clicks Google sign-in.
2. Supabase handles Google OAuth.
3. Browser returns to `/auth/callback`.
4. Frontend exchanges the OAuth code for a Supabase session.
5. Frontend calls backend `/api/auth/me`.
6. Backend validates token with Supabase Auth.
7. Backend creates or updates internal user.
8. User enters dashboard or booking flow.

### Admin Login

1. Admin signs in with Google.
2. Backend identifies email from Supabase user payload.
3. If email is in `ADMIN_EMAILS`, role is set to `administrador_sitio`.
4. Admin can access `/admin`.

### Product Booking

1. Student selects product.
2. Student selects availability slot and teacher if applicable.
3. Stripe Checkout is created when payments are configured.
4. On successful payment, backend creates booking.
5. Optional Google Calendar integration can create an event and Meet link.

### CMS Publishing

1. Editor/admin creates or edits a page/blog post.
2. Status is set to `draft` or `published`.
3. Public routes consume published content where implemented.

## Production URLs

Current Render production URLs:

```text
Frontend: https://mosaico-web.onrender.com
Backend:  https://mosaico-api.onrender.com
API root: https://mosaico-api.onrender.com/api/
```
