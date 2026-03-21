import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_settings
from app.ws_handler import router as ws_router

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="Voice Scheduling Agent",
    description="Real-time voice assistant for scheduling meetings using Gemini Live API",
    version="1.0.0",
)

origins = settings.cors_origins
if settings.serve_frontend:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "voice-scheduling-agent"}


@app.get("/api/calendar/status")
async def calendar_status():
    """Check if Google Calendar is configured and authorized."""
    import os
    settings = get_settings()
    has_credentials = os.path.exists(settings.google_calendar_credentials_path)
    has_token = os.path.exists("token.json")
    return {
        "credentials_file": has_credentials,
        "authorized": has_token,
        "instructions": (
            "1. Go to Google Cloud Console > APIs & Services > Credentials. "
            "2. Create an OAuth 2.0 Client ID (Desktop app). "
            "3. Download the JSON and save as 'credentials.json' in the backend/ folder. "
            "4. Run the server and call POST /api/calendar/authorize to complete OAuth."
        ) if not has_credentials else None,
    }


@app.post("/api/calendar/authorize")
async def calendar_authorize():
    """Trigger the Google Calendar OAuth flow (opens browser)."""
    try:
        from app.calendar_service import _get_calendar_service
        _get_calendar_service()
        return {"status": "ok", "message": "Google Calendar authorized successfully."}
    except FileNotFoundError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        return {"status": "error", "message": f"Authorization failed: {e}"}


# Serve frontend static files in production
if settings.serve_frontend:
    dist_path = os.path.abspath(settings.frontend_dist_path)
    if os.path.isdir(dist_path):
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = os.path.join(dist_path, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(os.path.join(dist_path, "index.html"))
