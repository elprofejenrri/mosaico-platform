# Operations Runbook

## Local Development

### Backend

```powershell
cd backend
py -3 -m pip install -r requirements.txt
py -3 -m uvicorn server:app --host 127.0.0.1 --port 8002 --reload
```

### Frontend

```powershell
cd frontend
npm install
$env:PORT="3001"
npm.cmd start
```

Local URLs:

```text
Frontend: http://localhost:3001
Backend:  http://localhost:8002/api/
Admin:    http://localhost:3001/admin
```

## Restart Local Backend

```powershell
$pid8002 = (Get-NetTCPConnection -LocalPort 8002 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($pid8002) { Stop-Process -Id $pid8002 -Force }
cd backend
py -3 -m uvicorn server:app --host 127.0.0.1 --port 8002
```

## Restart Local Frontend

```powershell
$pid3001 = (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($pid3001) { Stop-Process -Id $pid3001 -Force }
cd frontend
$env:PORT="3001"
npm.cmd start
```

## Validate Backend

Local:

```powershell
Invoke-RestMethod http://localhost:8002/api/
```

Production:

```powershell
Invoke-RestMethod https://mosaico-api.onrender.com/api/
```

Expected:

```json
{"app":"Lily Spanish","ok":true}
```

## Validate Frontend Build

```powershell
cd frontend
npm.cmd run build
```

Expected:

```text
Compiled successfully.
```

## Run Backend Tests

```powershell
py -3 -m pytest backend\tests
```

## Promote An Admin

Add the Google email to backend environment:

```env
ADMIN_EMAILS=person@example.com
```

For multiple admins:

```env
ADMIN_EMAILS=person1@example.com,person2@example.com
```

Restart backend after changing this value.

## Clear Browser Auth State

In browser console:

```js
localStorage.clear()
sessionStorage.clear()
location.reload()
```

## Force Google Account Picker

The app sends:

```js
prompt: "select_account"
```

This causes Google to show the account picker even when the browser has a Google session.

## Render Redeploy

After pushing code to GitHub:

```text
Render -> service -> Manual Deploy -> Deploy latest commit
```

For environment variable changes:

```text
Render -> service -> Environment -> Save Changes
```

Render normally redeploys after saving environment changes.

## Magic safe release

When the user says:

```text
magic
```

Run the safe release checklist:

1. Check local git state with `git status --short`.
2. Confirm the current branch and upstream.
3. Review pending changes and make sure documentation was updated or created.
4. Run relevant safety checks:
   - `python -m py_compile backend/server.py backend/database.py`
   - `npm run build` when frontend changed
   - `git diff --check`
5. Commit pending changes with a focused message.
6. Merge only if there is an explicit branch to merge and it is safe.
7. Push to `origin/main`.
8. Evaluate whether a backfill is needed.
9. Do not run destructive backfills or validate production constraints unless the data audit is clean and the action is explicitly approved.
10. Verify production health:
    - `https://mosaico-api.onrender.com/api/`
    - relevant frontend route or bundle when frontend changed
11. Report commit hash, push status, backfill status, and production health.

Production safety rule:

```text
Do not break prod.
```

## Supabase Storage

Bucket:

```text
mosaico
```

The backend tries to create it on startup. If it already exists, startup continues.

## Stripe

Payments are disabled until Stripe variables are set:

```env
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
```

If missing, checkout endpoints return a configuration error.

## Google Calendar

The legacy shared calendar is managed in Admin Settings. It is not consent for
the per-teacher integration and must not be used as a teacher refresh token.

The per-teacher integration is documented in
`docs/GOOGLE_CALENDAR_INTEGRATION.md`. Safe rollout order:

1. Configure Google Cloud consent, scopes and exact backend redirect.
2. Add backend/cron environment variables without enabling the switch.
3. Apply migration `004_google_calendar_teacher_integration.sql`.
4. Deploy with `GOOGLE_CALENDAR_INTEGRATION_ENABLED=false` and
   `teacher_google_calendar=false`.
5. Enable the backend switch for an approved test account.
6. Run unit/build checks and the manual privacy/conflict/idempotency matrix.
7. Enable the governed platform flag for a teacher pilot.
8. Configure Render Cron to run:

```powershell
python backend/sync_google_calendars.py
```

Operational signals are aggregate sync successes/failures, latency, rate limits,
refresh/reconnect state, event operations, conflicts and exhausted retries.
Never log tokens, full account email, calendar/event titles, descriptions or
attendees.

Functional rollback: set `teacher_google_calendar=false`, then disable
`GOOGLE_CALENDAR_INTEGRATION_ENABLED`. Do not drop tables or delete Google events
as part of rollback.
