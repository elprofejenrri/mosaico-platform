# Production Readiness Checklist

## Auth

- [ ] Social login configured with real Supabase project.
- [ ] Local login session duration reviewed.
- [ ] Dev auth disabled.
- [ ] Admin emails configured.

## RBAC

- [ ] Every user has at least one role.
- [ ] Super Admin accounts reviewed.
- [ ] Protected system roles verified.
- [ ] Permission changes audited.

## Database

- [ ] Schema applied successfully.
- [ ] Backups configured.
- [ ] Migration/backfill scripts reviewed.
- [ ] Credit ledger model completed before paid credit operations.

## Logs And Analytics

- [ ] Audit logs visible.
- [ ] Activity logs visible.
- [ ] Analytics dashboard visible.
- [ ] Error events persisted.
- [ ] Request IDs visible in support process.

## UX

- [ ] Critical actions have confirmation.
- [ ] Forms validate inputs.
- [ ] Empty/loading/error states exist.
- [ ] Mobile layouts reviewed.
- [ ] Accessibility pass completed.

## Deployment

- [ ] Render env vars configured.
- [ ] CORS locked.
- [ ] Smoke tests run.
- [ ] Rollback process known.
- [ ] Support contact and legal placeholders published.
