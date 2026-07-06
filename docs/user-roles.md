# User Roles

## Super Admin

Technical owner of the platform. Can manage all settings, roles, permissions, logs, audit trails, and system health. Super Admin access is protected against self-demotion and risky role changes require confirmation.

## School Administrative

Education administrator profile for the school principal/operator. Can create and manage classes, create and manage learning roadmaps, coordinate students and teachers, and review school reports. This role is intentionally non-technical and should not manage IAM, protected system roles, platform configuration, audit controls, or production system health unless an additional technical role is assigned.

Canonical role: `administrador_escolar`.

Primary portal: `/school-admin`.

## Technical Admin

Technical/platform administration profile. Can manage identity and access, protected configuration, audit logs, activity logs, settings, and governance surfaces. Technical Admin should not be used as the ordinary school principal profile.

Canonical role: `administrador_profesor`.

## Coordinator

Operational scheduler and school support role. Manages scheduling health, teacher/student coordination, class operations, and day-to-day platform execution with scoped permissions.

## Teacher

Runs live teaching operations. Can view calendar, availability, assigned students, classes, materials, evaluations, and earnings-related surfaces.

## Student/Client

Learner profile. Uses the roadmap, credits, classes, tests, practice, badges, progress, and community features as they become production-backed.

## Tutor/Parent

Guardian profile. Can monitor one or more students, manage shared credits, review progress, book classes, receive feedback, and coordinate learning.

## Viewer

Read-only operational profile for limited reporting and observation.
