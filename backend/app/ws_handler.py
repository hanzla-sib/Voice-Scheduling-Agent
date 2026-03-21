from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.gemini_live import GeminiLiveSession
from app.calendar_service import create_event

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/voice")
async def voice_websocket(ws: WebSocket):
    await ws.accept()
    logger.info("Client WebSocket connected")

    session: Optional[GeminiLiveSession] = None

    async def send_json(msg: dict):
        try:
            await ws.send_json(msg)
        except Exception:
            pass

    async def on_audio(audio_b64: str):
        await send_json({"type": "audio", "data": audio_b64})

    async def on_transcript(role: str, text: str):
        await send_json({"type": "transcript", "role": role, "text": text})

    async def on_tool_call(name: str, args: dict[str, Any]) -> dict:
        await send_json({
            "type": "schedule_update",
            "data": args,
            "function": name,
        })

        if name == "create_calendar_event":
            try:
                logger.info(f"Schedule request: {args}")
                event = create_event(
                    name=args.get("name", ""),
                    date=args.get("date", ""),
                    time=args.get("time", ""),
                    title=args.get("title"),
                    email=args.get("email"),
                )
                await send_json({
                    "type": "schedule_confirmed",
                    "data": {**args, "event_link": event.get("link", "")},
                })
                return {
                    "status": "success",
                    "message": (
                        f"Meeting '{event.get('summary')}' created successfully. "
                        f"Calendar link: {event.get('link', 'N/A')}. "
                        "Now briefly say goodbye and wish the user a good day."
                    ),
                }
            except Exception as e:
                logger.error(f"Failed to create event: {e}")
                await send_json({
                    "type": "schedule_error",
                    "error": str(e),
                })
                return {"status": "error", "message": f"Failed to create event: {e}"}

        return {"status": "error", "message": f"Unknown function: {name}"}

    async def on_status(status: str):
        await send_json({"type": "status", "status": status})

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "start":
                if session:
                    await session.disconnect()
                session = GeminiLiveSession(
                    on_audio=on_audio,
                    on_transcript=on_transcript,
                    on_tool_call=on_tool_call,
                    on_status=on_status,
                )
                try:
                    await session.connect()
                except Exception as e:
                    logger.error(f"Failed to connect Gemini session: {e}")
                    await send_json({
                        "type": "error",
                        "error": str(e),
                    })
                    session = None

            elif msg_type == "audio" and session:
                await session.send_audio(msg["data"])

            elif msg_type == "stop":
                if session:
                    await session.disconnect()
                    session = None

    except WebSocketDisconnect:
        logger.info("Client WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if session:
            await session.disconnect()
