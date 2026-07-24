# MOSAICO Profile Model

## Purpose

MOSAICO exposes one authenticated profile experience at `/profile`. A user may
have several effective RBAC roles and may select only a role already assigned
to the account. The client never chooses an identity, school, scope, approval,
or ownership boundary.

## Persistent model

- `auth_identities` maps each verified provider subject to one internal user;
  it stores no provider token.
- `users` is the internal account and compatibility source for display name
  and picture.
- `user_profiles` stores shared personal data and preferences once per user.
- `user_role_profiles` stores one validated role extension per user and role.
- `student_profiles` and `teacher_profiles` remain available to legacy
  administrative workflows and now hold the definitive specialized fields.
- `tutor_profiles` stores only tutor context and never creates student links.
- `onboarding_states` persists versioned, resumable progress.
- School assignments, tutor/student relationships, teacher/student
  assignments, effective scopes, and permissions continue to come from their
  existing RBAC tables. They are presented in a profile but cannot be edited
  there.

Migration `backend/migrations/003_user_profiles.sql` is additive,
transactional, and idempotent. It safely copies existing identity display data
into the shared profile table without inventing role-specific facts.
Migration `backend/migrations/005_identity_profile_onboarding.sql` additively
extends that foundation without automatically inferring missing profile,
approval, role, onboarding, or school facts.

## Persona fields

- Student: current level, learning goal, preferred class types, availability.
- Teacher: biography, teaching languages, specialties, authorized levels,
  certifications, modalities, optional presentation-video URL, approval.
- Tutor/Parent: relationship summary and linked students derived from
  `tutor_student_links`.
- School Administrator: institution, position, contact data, authorized
  schools, and effective scopes.
- Finance: position, authorized schools, and effective scopes. No finance
  transaction logic lives in the profile.
- Technical Admin: technical role, access level, last access, and recent
  activity. Permissions stay read-only and remain managed in IAM.

## Authorization and security

- `GET /api/profile`, `PATCH /api/profile`, and `POST /api/profile/photo`
  require an authenticated user.
- Reads and self-service updates require `profiles.view` and
  `profiles.update` with `self` scope.
- The server derives `user_id`, effective role, school assignments, scopes,
  links, approval, and ownership from authenticated state and database data.
- Unknown or cross-persona fields fail validation.
- A teacher cannot update their own approval.
- Pending and suspended teachers keep the minimum access needed to view and
  maintain their identity/profile, but teacher-derived scheduling and class
  permissions are withheld until approval is `approved`.
- `PATCH /api/admin/profiles/{user_id}/teacher-approval` is scope checked and
  rejects self-approval.
- Profile audit records store changed field names, not profile field values.

## Completion

Completion is computed by the backend from shared and role-specific required
fields. The response reports `complete`, `incomplete`, or `onboarding`, a
percentage, missing fields, and a next step. It is never accepted from the
client.

The definitive completion and onboarding contract, including state machines
and migration audit procedure, is in
`docs/USER_PROFILE_ONBOARDING_MODEL.md`.

The persisted `theme` preference (`system`, `light`, or `dark`) is returned
with the authenticated identity and applied to the profile experience.
Accessibility preferences remain data until each consuming module
implements the corresponding presentation behavior.

## Media

Profile photos use the existing Supabase Storage abstraction and the existing
five-megabyte image policy. Only JPEG, PNG, WebP, and GIF are accepted. The
stored object is registered in `files`, and the canonical picture URL is
synchronized to `users` for backward-compatible navigation and identity UI.

## Audit events

The profile workflow emits:

- `profile.updated`
- `profile.administrative.updated`
- `profile.photo.changed`
- `profile.language.changed`
- `profile.country.changed`
- `profile.phone.changed`
- `profile.preferences.changed`
- `profile.teacher.approval_changed`

The Activity tab shows the user's recent operational activity. The Audit tab
is returned and rendered only when the effective RBAC grants audit access.
