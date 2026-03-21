# Deploy on DigitalOcean App Platform (Docker)

This app is a **single Docker image**: Node builds the React UI, Python serves API + static files + WebSockets.

## Prerequisites

- GitHub repo with this code pushed
- DigitalOcean account + billing method (App Platform has a free allowance; check current pricing)
- **Gemini API key**, **Google Calendar** (service account JSON), **Gmail App Password** for SMTP invites

## 1. Dockerfile

The repo root `Dockerfile` is used as-is. It:

- Builds `frontend/` → `frontend/dist`
- Installs Python deps from `backend/requirements.txt`
- Runs Uvicorn on **`PORT`** (DigitalOcean sets this) or **8000** locally

## 2. Create the app in DigitalOcean

1. Log in to [DigitalOcean](https://cloud.digitalocean.com) → **Apps** → **Create App**.
2. Connect **GitHub** (or GitLab) and select this repository + branch (e.g. `main`).
3. DigitalOcean should detect a **Dockerfile** at the repo root.
   - If not: **Edit** the component → set **Dockerfile path** to `Dockerfile` and **Context** to `/` (repository root).
4. Set **Resource type**: **Web Service** (one service is enough).
5. **HTTP routes**: default is fine (route `/` → this service).
6. **Instance size**: pick the smallest that fits your budget (Docker build can be memory-heavy; if build fails, bump build/run size once).

## 3. Environment variables (required)

In the app → **Settings** → **App-Level Environment Variables** (or component env vars), add:

| Variable | Notes |
|----------|--------|
| `GEMINI_API_KEY` | From Google AI Studio |
| `GOOGLE_CALENDAR_ID` | Usually your Gmail / calendar email |
| `CALENDAR_TIMEZONE` | e.g. `UTC` or `America/New_York` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Entire** service account JSON as one line (see below) |
| `SMTP_EMAIL` | Gmail address used to send ICS invites |
| `SMTP_APP_PASSWORD` | Gmail App Password (not your normal password) |
| `SERVE_FRONTEND` | `true` |
| `FRONTEND_DIST_PATH` | `./frontend/dist` |

### Service account JSON on App Platform

You cannot mount `service-account.json` like on your laptop. Use the env var:

**Locally**, produce a one-line JSON (no newlines):

```bash
python3 -c "import json; print(json.dumps(json.load(open('backend/service-account.json'))))"
```

Copy the output into `GOOGLE_SERVICE_ACCOUNT_JSON` in DigitalOcean.

Remember: your Google Calendar must still be **shared** with the service account email (Editor / “Make changes to events”).

## 4. HTTP port

App Platform sets **`PORT`**. The Dockerfile already runs:

`uvicorn ... --port ${PORT:-8000}`

Do **not** hardcode port `8000` in the UI; the browser uses the same origin as your app URL, so WebSockets work as `wss://your-app.ondigitalocean.app/ws/voice`.

## 5. Health check (optional but recommended)

In the component settings, set:

- **HTTP health check path**: `/health`

## 6. Deploy

Save and **Deploy**. First deploy runs Docker build (several minutes). When green, open the **App URL** and test the mic + scheduling.

## 7. Troubleshooting

| Issue | What to check |
|-------|----------------|
| Build fails (npm/pip) | Logs → Build phase; increase build resources if OOM |
| 502 / app won’t start | Logs → `PORT` must be used (Dockerfile does); check env vars |
| WebSocket fails | HTTPS URL → browser uses `wss://`; ensure you’re not mixing http/https |
| Calendar 404/403 | Calendar shared with service account; `GOOGLE_CALENDAR_ID` correct |
| No invite email | `SMTP_*` correct; Gmail “less secure” not used — use App Password |

## 8. CORS

With `SERVE_FRONTEND=true`, the backend allows CORS broadly for same-origin SPA. Frontend and API share one hostname on App Platform.
