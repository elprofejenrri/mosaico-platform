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
- [ ] Teacher Google Calendar login consent is separate from application login.
- [ ] Calendar OAuth uses backend Authorization Code Flow, exact redirect URI,
      signed expiring one-time state, offline access and explicit consent.
- [ ] Calendar access/refresh tokens are Fernet-encrypted and never returned,
      logged, audited, placed in URLs, or stored in browser storage.
- [ ] Calendar encryption key, state secret and OAuth client secret are
      backend-only and independently generated.
- [ ] Requested Calendar scopes are limited to calendar-list read, free/busy and
      owned-event management; no Gmail, Drive or full-calendar scope.
- [ ] Backend revalidates calendar ownership and teacher self scope; IDOR,
      `teacher_id` manipulation and `calendar_id` manipulation tests pass.
- [ ] Busy cache contains no titles, descriptions, attendees, locations or notes.
- [ ] Provider failures fail closed before booking and never mean “available”.
- [ ] Deterministic event IDs and cross-instance booking locks prevent duplicates.
- [ ] Disconnect clears local credentials without cancelling classes or deleting
      existing Google events.
- [ ] Calendar feature and backend kill switches remain off until pilot approval.
