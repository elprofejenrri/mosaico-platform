# Auth Testing

This app uses Supabase Auth.

1. Configure Google as an OAuth provider in Supabase.
2. Add `http://localhost:3000/auth/callback` and your Render frontend callback URL to the Supabase redirect allow-list.
3. Sign in from the frontend.
4. For backend tests, copy a temporary user access token from the browser session and set:

```powershell
$env:SUPABASE_ADMIN_TEST_TOKEN="..."
$env:SUPABASE_STUDENT_TEST_TOKEN="..."
```

Never commit real access tokens.
