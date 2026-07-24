# MOSAICO Preview Action Audit

Date: 2026-07-05

## Purpose

This audit tracks visible UI actions that were still behaving like mockups: the button displayed a success notification, but no durable product action happened. Those actions are now treated as pending product workflows unless they are connected to a real service, API, or persisted state.

## Product Safety Change

The generic portal `ActionButton` no longer simulates success. If an action has no connected `onAction` handler, the button is disabled and explains that backend persistence is still required.

This applies to preview actions in:

- Student plan, course, booking, practice, community, badge, and sharing surfaces.
- Tutor/parent recommendations, alerts, reports, invoices, and sharing surfaces.
- Teacher follow-up, availability preview, materials, evaluations, and earnings preview surfaces.
- Administrative approval, credits, lesson, family, school setup, and note surfaces that are not already backed by real APIs.

The teacher calendar workspace keeps preview-service actions active for manual
availability, blocked time, invitations and class status updates. Google
Calendar connect, selection, free/busy sync and disconnect are backend-backed
behind disabled-by-default feature controls; they no longer simulate a
connection. Auxiliary actions that only showed toast feedback remain disabled
until real models exist.

High-risk local mutations are also blocked. Tutor credit purchase, tutor credit assignment, tutor class booking with credit deduction, and administrative credit grants no longer change local balances. They require a production credit ledger, payment checkout, booking lifecycle, and audit events before being enabled.

## Current Production-Backed Areas

- Authentication and session foundation.
- RBAC role and permission catalog.
- Admin user and role management in the dedicated RBAC workspace.
- Technical wiki and Mosaico Atlas content.
- Platform configuration settings.
- Audit logs and activity logs.
- Analytics and observability foundations.
- Health and version endpoints.
- Legacy public/admin CMS and booking endpoints where already implemented.

## Preview or Partially Connected Areas

### Student Experience

Status: mostly preview.

Needs persistence for:

- Daily learning plan start/resume.
- Student roadmap progress.
- Badges and achievements.
- Practice tests and placement tests.
- Community likes/comments.
- Class booking and rescheduling from the student portal.
- Progress sharing and report downloads.

### Tutor/Parent Experience

Status: mostly preview.

Needs persistence for:

- Tutor-to-student relationships and scoped access.
- Recommendations and alerts.
- Family sharing.
- Wallet/invoices tied to a real credit ledger.
- Credit purchase, assignment, and booking deduction flows.
- Tutor report exports.

### Teacher Experience

Status: calendar is advanced service-backed preview; other panels are preview.

Needs persistence for:

- Teacher availability tables.
- Slot publication and closure.
- Homework assignments.
- Student messaging.
- Teacher feedback tied to class records.
- Earnings and payout ledger.

### Administrative Operations

Status: mixed.

Production-backed:

- RBAC and role assignment in the dedicated admin RBAC component.
- Technical docs, Atlas, logs, settings, and analytics foundations.

Needs persistence for:

- Approvals workflow.
- Credit grants and refunds.
- Ledger-backed school credit pool.
- Lesson creation/review/publishing.
- Teacher approval workflow.
- Family accounts.
- Operational reports.
- Administrative school setup values not already covered by platform settings.

## Definitions Needed From Product Owner

1. Credit rules:
   - Credits charged for 30, 45, and 60 minute classes.
   - Refund policy for cancellation, late cancellation, no-show, and teacher cancellation.
   - Who can grant credits and whether grants require a reason or approval.

2. Booking rules:
   - Who can book for a student: student, tutor/parent, coordinator, teacher, admin.
   - Minimum notice, maximum advance booking, reschedule windows, and cooldown gap.
   - Whether multiple class durations can be offered inside one availability block.

3. Learning roadmap rules:
   - Required levels, milestones, tests, and badge unlocks.
   - Whether badges unlock credits, levels, content, or certificates.
   - What counts as passing a test or completing a roadmap step.

4. Lesson CMS rules:
   - Lesson states: draft, review, approved, published, archived.
   - Required fields and who can publish.
   - Whether lessons belong to levels, skills, courses, tests, or all of them.

5. Communications rules:
   - Whether messaging is internal inbox, email-only, WhatsApp handoff, or all.
   - Notification templates and opt-in preferences.

## Next Implementation Order

1. Booking and credits domain.
   - Create credit ledger, booking lifecycle, availability blocks, and duration/cooldown rules.
   - Wire student/tutor booking buttons to real APIs.

2. Learning roadmap domain.
   - Create roadmap, milestone, badge, test, and practice-test models.
   - Wire student dashboard, roadmap, badges, and tests.

3. Lesson CMS and approvals.
   - Create lesson workflow and approval queue.
   - Wire admin lesson and approval buttons.

4. Teacher operations.
   - Replace teacher calendar mock service with backend APIs.
   - Add homework, feedback, messages, slot sharing, and slot closure.

5. Reports and exports.
   - Generate real report downloads and export audit events.

## Rule Going Forward

No visible button should claim success unless at least one of these is true:

- It persisted data through a backend API.
- It changed durable local state intentionally documented as local-only.
- It created an auditable operational request.
- It is explicitly disabled with a clear reason.
