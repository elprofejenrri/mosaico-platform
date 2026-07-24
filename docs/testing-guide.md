# Testing Guide

## Backend Unit Tests

```powershell
python -m pytest backend\tests\test_super_admin_configuration.py -q
```

Current coverage includes platform configuration validation, Super Admin wildcard permission, analytics catalog presence, and error payload contract.

## Backend Compile Check

```powershell
python -m py_compile backend\server.py backend\database.py
```

## Identity, profile, and onboarding

```powershell
python -m pytest backend/tests/test_identity_onboarding.py backend/tests/test_identity_migration_contract.py backend/tests/test_profile_policy.py backend/tests/test_rbac_api_contract.py -q
python backend/audit_identity_profile_onboarding.py
```

The unit/contract suite covers email normalization, allowed initial roles,
student/teacher completion differences, resumable-state validation,
mass-assignment rejection, bounded states, additive migration structure, and
API/table registration. The audit requires a configured database and emits
aggregate counts without personal data.

## Frontend Tests

```powershell
cd frontend
npm test -- --watchAll=false --passWithNoTests
```

The frontend suite includes shared mobile shell component and permission
filtering coverage. Run the focused suite with:

```powershell
cd frontend
npm test -- --watchAll=false --runInBand src/components/mobile/MobileWorkspaceHeader.test.jsx
```

The suite covers drawer rendering/dismissal, one-open behavior, focus
trap/restoration, Escape/backdrop, active route, unauthorized action removal,
no-action state, state preservation, route cleanup, ES/EN accessible labels,
and the header contract at 320, 360, 390, 430, tablet, and desktop widths.

CSS visibility and real-browser layout still require the manual/E2E matrix in
`docs/MOBILE_UX_AND_NAVIGATION_STANDARD.md`; jsdom does not evaluate Tailwind
media queries or mobile browser safe areas.

## Frontend Build

```powershell
cd frontend
npm run build
```

## Integration Tests

`backend/tests/test_lily_api.py` targets a running API and optional Supabase tokens:

- `REACT_APP_BACKEND_URL`
- `SUPABASE_ADMIN_TEST_TOKEN`
- `SUPABASE_STUDENT_TEST_TOKEN`

## Recommended Starter Tests

- Login/register success and failure.
- RBAC protected route denial.
- Admin role assignment safety.
- Platform setting validation and audit creation.
- Booking lifecycle.
- Credit ledger.
- Analytics event creation.
- Error response shape.
- Teacher availability slot generation.

## Google Calendar integration

Automated tests use mocked/pure provider behavior only:

```powershell
python -m pytest backend/tests/test_google_calendar_service.py backend/tests/test_google_calendar_api_contract.py -q
```

Coverage includes minimal scopes, token encryption, masked account output,
free/busy normalization, overlap/contiguous boundaries, IANA conversion,
ambiguous/nonexistent DST rejection, generic event privacy, deterministic
idempotency, endpoint ownership contracts, single-use state, fail-closed
provider behavior, advisory booking locks, and disconnect retention.

Do not call destructive real-calendar operations from automated tests. The
approved manual test matrix is in `docs/GOOGLE_CALENDAR_INTEGRATION.md`.
