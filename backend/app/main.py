import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.ws_handler import router as ws_router

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="Voice Scheduling Agent",
    description="Real-time voice assistant for scheduling meetings using Gemini Live API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "voice-scheduling-agent"}
