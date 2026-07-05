# Business Structure

## Core Users

- Students: individual learners buying Spanish outcomes.
- Tutors/parents: decision-makers and payers for dependent learners.
- Teachers: supply-side educators delivering live classes and feedback.
- Coordinators: operators who keep schedules, teachers, and students moving.
- Admins: school principals/managers who control operations, credits, lessons, users, and reports.
- Super Admins: technical/platform owners.

## Value Proposition

MOSAICO offers structured Spanish learning with live classes, visible progress, flexible credits, teacher availability, parent visibility, and operational controls for the school.

## Key Workflows

- Account creation and role assignment.
- Credit purchase or grant.
- Class booking.
- Teacher availability management.
- Class completion and feedback.
- Student progress and roadmap movement.
- Parent/tutor monitoring.
- Admin reporting and support.

## Monetization Paths

- Single classes.
- Credit packs.
- Monthly subscriptions.
- Premium teacher tiers.
- Cohort/course bundles.
- Corporate or school partnerships.

## Credit Model

Recommended placeholder:

- 30 minute class: 1 credit.
- 45 minute class: 1.5 or 2 credits.
- 60 minute class: 2 credits.
- Admin-granted credits require a reason and audit log.
- Credits should be ledger-based before paid launch.

## Teacher Marketplace Model

Teachers can expose availability and specialization. MOSAICO can route demand by level, objective, schedule fit, teacher utilization, and student preference. Teacher payout rules should be documented before production earnings launch.

## Student And Tutor Model

Students own learning activity. Tutors/parents manage linked student accounts, credits, bookings, feedback, and progress visibility. Tutor permissions must be scoped to linked students only.

## Admin And Coordinator Operations

Admins govern business operations. Coordinators manage daily execution. Super Admins control platform configuration and sensitive RBAC/security surfaces.

## Success Metrics

- Activation: account created and first class booked.
- Engagement: dashboard views, roadmap progress, practice/test completion.
- Learning: level advancement, badge unlocks, feedback quality.
- Business: credits purchased, booking conversion, class completion, retention.
- Operations: teacher utilization, empty slots, cancellation rate, no-show rate.

## Risks

- Money movement without ledger-grade credits.
- Calendar conflicts if sync remains mocked.
- Tutor/student scoping mistakes.
- Over-permissioned admin users.
- Weak production test coverage.

## Operational Requirements

- Support process with request IDs.
- Audit reviews for sensitive actions.
- Backup and restore process.
- Incident rollback process.
- Teacher onboarding and availability standards.

## Recommended MVP Launch Scope

- Real auth.
- Real RBAC.
- Real user/admin management.
- Real booking lifecycle.
- Real credit ledger.
- Teacher availability backend.
- Basic analytics and audit logs.
- Limited public pricing/products.

## Post-Launch Roadmap

- Google Calendar two-way sync.
- Advanced roadmap/badges/tests.
- Teacher marketplace ranking.
- Parent notifications.
- Revenue/teacher payout reporting.
- AI tutor with guardrails.
