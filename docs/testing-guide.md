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

## Frontend Tests

```powershell
cd frontend
npm test -- --watchAll=false --passWithNoTests
```

The current frontend suite has no discovered tests. Add tests for navigation, role gating, form validation, and critical flows.

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
