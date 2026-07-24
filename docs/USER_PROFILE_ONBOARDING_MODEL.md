# User, Profile, and Onboarding Model

## Scope

This document defines the production foundation for identity, internal users,
profiles, onboarding, initial roles, account state, and teacher approval. It
does not implement the visual registration/onboarding wizard or any academic,
booking, calendar, credit, payment, or messaging workflow.

## Domain boundaries

```text
Verified Auth Identity
  -> Internal User
  -> Common Profile
  -> Student / Teacher / Tutor Profile
  -> User Roles
  -> School Memberships (only with authoritative evidence)
  -> Onboarding State
  -> Teacher Approval State
```

Authentication identity, personal profile data, authorization, school scope,
onboarding progress, and teacher approval are separate sources of truth.

## Tables

| Table | Purpose | Important constraints |
| --- | --- | --- |
| `auth_identities` | Maps a verified provider identity to one internal user. | Unique `(provider, provider_user_id)`; no tokens. |
| `users` | Internal account and compatibility identity. | Stable `user_id`; normalized email lookup; bounded account status. |
| `user_profiles` | One shared profile per user. | Unique `user_id`; backend-owned completion metadata. |
| `student_profiles` | Student-only learning preferences and self-reported starting data. | Unique `user_id`; `current_level` is not self-editable. |
| `teacher_profiles` | Teacher professional data and approval state. | Unique `user_id`; bounded approval status. |
| `tutor_profiles` | Minimal tutor context. | Unique `user_id`; creates no student relationship. |
| `user_roles` | Canonical role assignments. | At least one active role by service policy. |
| `user_school_memberships` | Authoritative school membership. | No default or inferred school. |
| `onboarding_states` | Resumable, versioned progress. | Unique `(user_id, onboarding_type, version)`; bounded state. |
| `audit_events` | Security and operational evidence. | Metadata contains field names/state codes, not full personal payloads. |

## Account and approval states

Account status:

- `pending_profile`
- `pending_approval`
- `active`
- `suspended`
- `inactive`

Onboarding status:

- `not_started`
- `in_progress`
- `completed`
- `blocked`
- `requires_review`

Teacher approval:

- `incomplete`
- `pending`
- `approved`
- `rejected`
- `suspended`

Profile completion, onboarding completion, account activity, role activity,
and teacher approval are deliberately independent.

## Public registration

Public account types are only student and teacher.

- Student receives `alumno`.
- Teacher receives `profesor` and approval `incomplete`.
- Privileged, administrative, finance, school, tutor, and compatibility roles
  cannot be requested through public registration.
- No school or membership is created or inferred.

Local registration uses one database transaction for the internal user,
provider identity, common profile, specialized profile, onboarding record,
initial role, and audit event. A transaction advisory lock and normalized
email lookup protect concurrent retries. Provider callbacks use the verified
provider subject, never a frontend-supplied identity claim.

## Completion

The backend calculates the percentage and missing fields.

Common required fields:

- first name
- last name
- country code
- timezone
- preferred language

Student requirements add native/learning language, self-reported level,
learning goal, class format, and general availability. Teacher requirements
add professional biography, taught languages, teaching modalities, and
experience summary.

`current_level` is an operational/academic value and cannot be self-assigned.
A complete teacher remains unapproved until an authorized reviewer acts.

## API contracts

- `GET /api/auth/me` returns compatible identity fields plus account,
  completion, onboarding, next-action, and teacher-approval state when
  applicable.
- `GET /api/auth/me/permissions` remains the permission/source-scope contract.
- `GET /api/auth/me/onboarding` returns resumable state and missing fields.
- `PATCH /api/auth/me/onboarding` saves non-terminal progress only.
- `POST /api/auth/me/onboarding/complete` completes only when backend
  requirements pass.
- `GET /api/admin/users/{user_id}/onboarding` requires scoped profile-read
  authorization.
- `PATCH /api/admin/profiles/{user_id}/teacher-approval` supports pending,
  approved, rejected, and suspended; rejection requires a reason.

## Migration and data audit

Migration `backend/migrations/005_identity_profile_onboarding.sql` is additive,
transactional, and idempotent. It does not delete, rename, assign schools,
reassign roles, fabricate profile facts, complete onboarding, or approve
teachers.

Run the read-only aggregate audit before applying it:

```powershell
python backend/audit_identity_profile_onboarding.py
```

The audit reports counts only. Duplicate normalized emails or profiles require
manual review; no ambiguous merge/backfill is provided. The migration creates
the normalized-email unique index only when existing data is conflict-free.

## Security rules

- Backend derives self identity, roles, approval, and school scope.
- Profile/onboarding payloads use explicit allowlists.
- Onboarding cannot mutate user, role, school, approval, or identity fields.
- Protected roles cannot be publicly requested.
- Suspended/inactive accounts cannot authenticate with persistent sessions.
- Teacher approval is scope-checked and self-approval is denied.
- Audit metadata avoids tokens, passwords, complete email addresses, and full
  profile bodies.

## Manual validation

1. Run the aggregate audit against a controlled database.
2. Apply migration 005 twice; both executions must succeed.
3. Register a student and a teacher; inspect aggregate records only.
4. Confirm each has exactly one common profile, one specialized profile, one
   onboarding state, and the expected active role.
5. Confirm neither has a school membership.
6. Confirm a privileged `profile_type` returns `422`.
7. Save onboarding progress, re-authenticate, and confirm it resumes.
8. Attempt completion with missing fields and confirm `409`.
9. Confirm a teacher completion produces `pending_approval`, not approval.
10. Confirm self-approval and out-of-scope admin reads return `403`.
