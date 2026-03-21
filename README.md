# Voice Scheduling Agent

Real-time voice scheduling assistant built with:
- `FastAPI` backend
- `Google Gemini 2.5 Flash Live API` for live conversation
- `React + MUI + Framer Motion + shadcn/ui` frontend
- `Google Calendar API` for event creation
- `Gmail SMTP + ICS` fallback for attendee invite emails

## What This Agent Does

- Starts a live conversation with the user
- Collects `name`, `email`, `date`, `time`, and optional `meeting title`
- Confirms details before scheduling
- Creates a real Google Calendar event
- Sends invite email to attendee (works for personal Gmail too via SMTP ICS)

## Deployed URL

- Frontend/Agent URL: `ADD_YOUR_DEPLOYED_URL_HERE`
- Backend URL (if separate): `ADD_YOUR_BACKEND_URL_HERE`

## How To Test (Hosted)

1. Open the deployed URL.
2. Click the mic button to start.
3. Speak details, for example:
   - "My name is Hanz."
   - "Schedule for 2026-03-25 at 16:30."
   - "Title is Product Sync."
   - "Invite hanzlasib24@gmail.com."
4. Confirm when the assistant asks.
5. Verify:
   - Event is created in your Google Calendar.
   - Invite email is received by the attendee.

## Local Setup (Optional)

### 1) Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update `backend/.env`:
- `GEMINI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_PATH` (usually `service-account.json`)
- `GOOGLE_CALENDAR_ID` (your calendar email or ID)
- `SMTP_EMAIL` (your Gmail)
- `SMTP_APP_PASSWORD` (Google App Password)

Run backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --ws-ping-interval 30 --ws-ping-timeout 120
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Calendar Integration Explained

This project uses a two-part scheduling flow:

1. **Event Creation (Google Calendar API)**
   - Backend attempts to create the event on your configured calendar.
   - For service accounts, event creation works after sharing your calendar with the service account email.

2. **Invite Delivery**
   - If service account attendee notifications are blocked (`forbiddenForServiceAccounts`), backend falls back safely:
     - creates event without API attendee notification
     - sends attendee a proper `ICS` invite email via Gmail SMTP
   - This ensures invite delivery for personal Gmail scenarios where service accounts cannot directly send attendee invites.

## Non-Voice Sample Test (Recommended)

To test event creation + invite email without speaking every time:

```bash
cd backend
python scripts/sample_invite_test.py
```

This script:
- creates a sample event (auto date/time in near future)
- sends invite to `hanzlasib24@gmail.com`
- prints event ID, link, and invite status

## Evidence (Logs / Screenshots / Video)

Add your proof artifacts here:
- Screenshot of created event in Google Calendar
- Screenshot of invite email in inbox
- Terminal output of `sample_invite_test.py`
- Optional Loom demo link: `ADD_LOOM_LINK_HERE`