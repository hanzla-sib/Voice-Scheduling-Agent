from __future__ import annotations

import logging
import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


def _build_ics(
    organizer_email: str,
    attendee_email: str,
    attendee_name: str,
    start_dt: datetime,
    end_dt: datetime,
    summary: str,
    description: str,
) -> str:
    uid = f"{uuid.uuid4()}@voice-scheduler"
    now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    start = start_dt.strftime("%Y%m%dT%H%M%SZ")
    end = end_dt.strftime("%Y%m%dT%H%M%SZ")

    return (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//Azamin Voice Scheduler//EN\r\n"
        "CALSCALE:GREGORIAN\r\n"
        "METHOD:REQUEST\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{now}\r\n"
        f"DTSTART:{start}\r\n"
        f"DTEND:{end}\r\n"
        f"SUMMARY:{summary}\r\n"
        f"DESCRIPTION:{description}\r\n"
        f"ORGANIZER;CN=Azamin Scheduler:mailto:{organizer_email}\r\n"
        f"ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;"
        f"RSVP=TRUE;CN={attendee_name}:mailto:{attendee_email}\r\n"
        "STATUS:CONFIRMED\r\n"
        "SEQUENCE:0\r\n"
        "BEGIN:VALARM\r\n"
        "TRIGGER:-PT15M\r\n"
        "ACTION:DISPLAY\r\n"
        "DESCRIPTION:Reminder\r\n"
        "END:VALARM\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )


def send_calendar_invite(
    attendee_email: str,
    attendee_name: str,
    date: str,
    time: str,
    title: Optional[str] = None,
) -> bool:
    settings = get_settings()

    if not settings.smtp_email or not settings.smtp_app_password:
        logger.warning("SMTP not configured, skipping email invite")
        return False

    event_title = title or f"Meeting with {attendee_name}"
    start_dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    end_dt = start_dt + timedelta(hours=1)

    ics_content = _build_ics(
        organizer_email=settings.smtp_email,
        attendee_email=attendee_email,
        attendee_name=attendee_name,
        start_dt=start_dt,
        end_dt=end_dt,
        summary=event_title,
        description=f"Scheduled via Azamin Voice Scheduler for {attendee_name}.",
    )

    # The outer message must be multipart/alternative so email clients
    # treat the text/calendar part as the "richest" renderable view,
    # which triggers the native Accept/Decline calendar UI.
    msg = MIMEMultipart("alternative")
    msg["From"] = f"Azamin Scheduler <{settings.smtp_email}>"
    msg["To"] = attendee_email
    msg["Subject"] = f"Invitation: {event_title}"

    text_part = MIMEText(
        f"You've been invited to: {event_title}\n"
        f"Date: {date}\n"
        f"Time: {time}\n\n"
        f"This invite was created by Azamin Voice Scheduler.",
        "plain",
        "utf-8",
    )
    msg.attach(text_part)

    html_part = MIMEText(
        f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #7c3aed; margin-bottom: 4px;">{event_title}</h2>
  <p style="color: #71717a; font-size: 14px; margin-top: 0;">Calendar Invite</p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 16px 0;">
  <table style="font-size: 14px; color: #3f3f46;">
    <tr><td style="padding: 6px 16px 6px 0; color: #a1a1aa;">Name</td><td><b>{attendee_name}</b></td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #a1a1aa;">Date</td><td><b>{date}</b></td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #a1a1aa;">Time</td><td><b>{time}</b></td></tr>
  </table>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 16px 0;">
  <p style="color: #a1a1aa; font-size: 12px;">Sent by Azamin Voice Scheduler</p>
</div>""",
        "html",
        "utf-8",
    )
    msg.attach(html_part)

    # The ICS part MUST use content-type text/calendar with method=REQUEST
    # and MUST NOT have Content-Disposition: attachment — this is what makes
    # Gmail/Outlook show the native Accept/Decline/Tentative buttons.
    ics_part = MIMEBase("text", "calendar", method="REQUEST", charset="utf-8")
    ics_part.set_payload(ics_content.encode("utf-8"))
    msg.attach(ics_part)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_email, settings.smtp_app_password)
            server.send_message(msg)
        logger.info(f"Calendar invite sent to {attendee_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send invite email: {e}")
        return False
