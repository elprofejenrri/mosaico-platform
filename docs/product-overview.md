# Product Overview

## What MOSAICO Is

MOSAICO is a managed online Spanish learning platform for students, parents/tutors, teachers, coordinators, and administrators. The product combines learning roadmaps, live class booking, credits, teacher availability, progress visibility, administrative operations, RBAC, analytics, and auditability.

## Main Roles

- Student/client: learns, books classes, uses credits, follows a roadmap, earns badges, and completes practice or tests.
- Tutor/parent: manages one or more student learners, credits, progress, classes, and communication.
- Teacher: opens availability, manages classes, reviews students, and gives feedback.
- Coordinator: manages scheduling health, students, teachers, and day-to-day school operations.
- Admin: manages school operations, content, credits, users, analytics, and reports.
- Super Admin: owns platform configuration, RBAC, audit logs, system health, and sensitive controls.

## Main Modules

- Public site, pricing, FAQ, blog, booking entry points.
- Auth with Supabase/social login and local email/password sessions.
- Student, tutor, teacher, and admin portals.
- RBAC roles and permissions.
- Super Admin configuration center.
- Audit logs, activity logs, analytics dashboard, and error tracking.
- Teacher calendar workspace with availability and schedule states.
- Technical wiki available inside the platform for technical roles.

## Current Position

The app is between MVP and production platform. Core administration, RBAC, analytics foundations, documentation, auth, and deployment structure exist. Some education workflows remain frontend-first or mock-backed and must be connected to production backend models before broad launch.

## Known Limitations

- Google Calendar sync UI exists, but full OAuth/token persistence and production sync workflows still need completion.
- Several student/tutor learning and badge workflows are still frontend-first.
- Credit wallet logic has placeholders and needs a ledger-grade model before real money operations.
- More E2E coverage is needed before production traffic.
