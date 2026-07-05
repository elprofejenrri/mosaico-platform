# Release Process

## Branch Flow

1. Work on feature branches.
2. Run local checks.
3. Review diff for risky backend/schema changes.
4. Merge to main only after build/test pass.
5. Deploy alpha/beta first when possible.
6. Promote to production after smoke tests.

## Required Checks

```powershell
python -m py_compile backend\server.py backend\database.py
python -m pytest backend\tests\test_super_admin_configuration.py -q
cd frontend
npm test -- --watchAll=false --passWithNoTests
npm run build
```

## Approval

Production releases require approval from product owner and technical owner. RBAC, auth, payment, database, and scheduling changes require extra review.

## Rollback

- Revert the Render deploy to the previous successful build.
- If schema changed, confirm rollback compatibility before database writes.
- Disable risky features through feature flags when available.
- Record the incident and mitigation in operations notes.

## Smoke Test

- Public site loads.
- Login works.
- Admin dashboard loads.
- RBAC page loads.
- Analytics dashboard loads.
- Audit/activity logs load.
- Booking/payment sandbox flow works if configured.
