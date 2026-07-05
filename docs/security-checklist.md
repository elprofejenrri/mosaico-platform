# Security Checklist

- [ ] `DEV_AUTH` disabled in production.
- [ ] `MOSAICO_ENV=production` or `APP_ENV=production`.
- [ ] Supabase JWT secret real and private.
- [ ] Service role key never exposed to frontend.
- [ ] CORS only allows production frontend domain.
- [ ] Admin/Super Admin accounts reviewed.
- [ ] All sensitive endpoints use backend permission checks.
- [ ] Role changes, permission changes, credits, settings, exports, and cancellations audit logged.
- [ ] Users cannot self-demote out of last admin access.
- [ ] System roles cannot be deleted.
- [ ] Error responses do not expose stack traces.
- [ ] Uploads enforce MIME and size limits.
- [ ] Stripe webhook secret configured.
- [ ] Backups and access logs enabled in Supabase/Render.
- [ ] Privacy policy and terms placeholders reviewed before public launch.
