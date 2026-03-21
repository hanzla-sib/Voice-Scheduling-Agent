from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.calendar_service import create_event
from app.config import get_settings


def main() -> None:
    settings = get_settings()

    # Use a near-future time to avoid accidental past-dated invites.
    start = datetime.utcnow() + timedelta(hours=2)
    date = start.strftime("%Y-%m-%d")
    time = start.strftime("%H:%M")

    target_email = "hanzlasib24@gmail.com"
    name = "Hanz Test Recipient"
    title = "Sample Invite Test - Voice Scheduler"

    if not settings.smtp_email or not settings.smtp_app_password:
        print("ERROR: SMTP_EMAIL / SMTP_APP_PASSWORD not configured in backend/.env")
        return

    print("Creating calendar event and sending invite...")
    print(f"Recipient: {target_email}")
    print(f"Date: {date}")
    print(f"Time: {time}")
    print(f"Title: {title}")

    result = create_event(
        name=name,
        date=date,
        time=time,
        title=title,
        email=target_email,
    )

    print("\nDone.")
    print(f"Event ID: {result.get('event_id')}")
    print(f"Event Link: {result.get('link')}")
    print(f"Invite Sent: {result.get('invite_sent')}")


if __name__ == "__main__":
    main()
