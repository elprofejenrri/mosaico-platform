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

Calendar integration is managed in Admin Settings and requires:

- Client ID
- Client Secret
- Refresh token
- Calendar ID

Use the admin test invite action after configuring.

