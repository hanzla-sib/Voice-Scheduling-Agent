from __future__ import annotations

import json
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from app.config import get_settings
from app.credentials_bootstrap import read_service_account_json_from_environment
from app.email_invite import send_calendar_invite

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]
TOKEN_PATH = "token.json"


def _get_calendar_service():
    """Build a Google Calendar API service.

    Priority:
    1. GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_SERVICE_ACCOUNT_JSON (cloud deploy)
    2. Service account file on disk
    3. OAuth 2.0 desktop flow (local dev fallback)
    """
    settings = get_settings()

    # Option 1: Inline JSON from env (cloud-friendly)
    json_str = read_service_account_json_from_environment()
    if json_str:
        try:
            sa_info = json.loads(json_str)
            creds = service_account.Credentials.from_service_account_info(
                sa_info, scopes=SCOPES
            )
            logger.info(f"Using service account (env): {creds.service_account_email}")
            return build("calendar", "v3", credentials=creds)
        except json.JSONDecodeError as e:
            logger.error(
                "Failed to parse service account JSON from env. "
                "Use one line JSON or GOOGLE_SERVICE_ACCOUNT_JSON_B64 (base64 of the file). "
                f"Error: {e}"
            )
        except Exception as e:
            logger.error(f"Failed to load service account from env: {e}")

    # Option 2: Service account file on disk
    sa_path = settings.google_service_account_path
    if os.path.exists(sa_path):
        creds = service_account.Credentials.from_service_account_file(
            sa_path, scopes=SCOPES
        )
        logger.info(f"Using service account (file): {creds.service_account_email}")
        return build("calendar", "v3", credentials=creds)

    # Option 3: OAuth 2.0 Desktop flow (fallback)
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
                    "No Google Calendar credentials. On the deployed app, set ONE of:\n"
                    "  • GOOGLE_SERVICE_ACCOUNT_JSON — full JSON on one line\n"
                    "  • GOOGLE_SERVICE_ACCOUNT_JSON_B64 — base64 of the JSON file (most reliable)\n"
                    "  • GOOGLE_SERVICE_ACCOUNT_JSON_FILE — path to a mounted secret file\n"
                    f"Locally: place '{sa_path}' or OAuth JSON at '{credentials_path}'."
                )
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=9090, open_browser=True)

        with open(TOKEN_PATH, "w") as token_file:
            token_file.write(creds.to_json())

    return build("calendar", "v3", credentials=creds)


def create_event(
    name: str,
    date: str,
    time: str,
    title: Optional[str] = None,
    email: Optional[str] = None,
) -> dict:
    """Create a Google Calendar event and optionally invite an attendee.

    Args:
        name: The user's name
        date: Date in YYYY-MM-DD format
        time: Time in HH:MM format (24-hour)
        title: Optional meeting title
        email: Optional attendee email to send a calendar invite

    Returns:
        dict with event details including the calendar link
    """
    settings = get_settings()
    service = _get_calendar_service()

    event_title = title or f"Meeting with {name}"
    start_dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    end_dt = start_dt + timedelta(hours=1)

    event_body = {
        "summary": event_title,
        "description": f"Meeting scheduled via Voice Scheduling Agent.\nScheduled for: {name}",
        "start": {
            "dateTime": start_dt.isoformat(),
            "timeZone": settings.calendar_timezone,
        },
        "end": {
            "dateTime": end_dt.isoformat(),
            "timeZone": settings.calendar_timezone,
        },
    }

    if email:
        event_body["attendees"] = [
            {"email": email, "displayName": name},
        ]
        event_body["description"] += f"\nAttendee email: {email}"

    calendar_id = settings.google_calendar_id

    try:
        event = (
            service.events()
            .insert(calendarId=calendar_id, body=event_body, sendUpdates="all")
            .execute()
        )
    except Exception as e:
        if "forbiddenForServiceAccounts" in str(e) or "cannot invite attendees" in str(e):
            logger.warning("Service account can't send invites, creating event without attendees")
            event_body.pop("attendees", None)
            event = (
                service.events()
                .insert(calendarId=calendar_id, body=event_body)
                .execute()
            )
        else:
            raise

    logger.info(f"Calendar event created: {event.get('htmlLink')}")

    invite_sent = False
    if email:
        invite_sent = send_calendar_invite(
            attendee_email=email,
            attendee_name=name,
            date=date,
            time=time,
            title=title,
        )

    return {
        "event_id": event.get("id"),
        "link": event.get("htmlLink"),
        "summary": event.get("summary"),
        "start": event["start"].get("dateTime"),
        "end": event["end"].get("dateTime"),
        "invite_sent": invite_sent,
    }
