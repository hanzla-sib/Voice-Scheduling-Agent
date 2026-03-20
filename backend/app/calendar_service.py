from __future__ import annotations

import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from app.config import get_settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
TOKEN_PATH = "token.json"


def _get_calendar_service():
    settings = get_settings()
    creds = None

    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            credentials_path = settings.google_calendar_credentials_path
            if not os.path.exists(credentials_path):
                raise FileNotFoundError(
                    f"Google Calendar credentials file not found at '{credentials_path}'. "
                    "Download it from Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs."
                )
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=9090, open_browser=True)

        with open(TOKEN_PATH, "w") as token_file:
            token_file.write(creds.to_json())

    return build("calendar", "v3", credentials=creds)


def create_event(name: str, date: str, time: str, title: Optional[str] = None) -> dict:
    """Create a Google Calendar event.

    Args:
        name: Attendee/organizer name
        date: Date in YYYY-MM-DD format
        time: Time in HH:MM format (24-hour)
        title: Optional meeting title

    Returns:
        dict with event details including the calendar link
    """
    service = _get_calendar_service()

    event_title = title or f"Meeting with {name}"
    start_dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    end_dt = start_dt + timedelta(hours=1)

    event_body = {
        "summary": event_title,
        "description": f"Meeting scheduled via Voice Scheduling Agent for {name}.",
        "start": {
            "dateTime": start_dt.isoformat(),
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": end_dt.isoformat(),
            "timeZone": "UTC",
        },
    }

    event = service.events().insert(calendarId="primary", body=event_body).execute()

    logger.info(f"Calendar event created: {event.get('htmlLink')}")

    return {
        "event_id": event.get("id"),
        "link": event.get("htmlLink"),
        "summary": event.get("summary"),
        "start": event["start"].get("dateTime"),
        "end": event["end"].get("dateTime"),
    }
