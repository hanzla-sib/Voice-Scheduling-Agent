from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Any, Optional

from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are a friendly and professional voice scheduling assistant. Your job is to help users schedule meetings.

Follow this conversation flow:
1. Greet the user warmly and ask for their name.
2. Once you have their name, ask what date they'd like to schedule the meeting.
3. Ask for their preferred time.
4. Optionally ask if they'd like to add a meeting title/subject. If they decline, that's fine.
5. Summarize ALL collected details back to the user clearly and ask for explicit confirmation (e.g. "Does that sound right?").
6. ONLY after the user confirms, call the `create_calendar_event` function with the collected details.
7. After the function succeeds, let the user know the meeting has been scheduled.

Important rules:
- Keep responses concise (1-2 sentences) since this is a voice conversation.
- When the user says a date like "next Monday" or "tomorrow", convert it to YYYY-MM-DD format. Today's date is important for this.
- Convert times to 24-hour HH:MM format (e.g. "3pm" becomes "15:00").
- NEVER call the function until the user explicitly confirms the details.
- If the user wants to change something, accommodate the change and re-confirm.
- Be natural, warm, and conversational."""

SCHEDULING_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="create_calendar_event",
                description="Creates a calendar event with the scheduling details collected from the user.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "name": types.Schema(type="STRING", description="The user's name"),
                        "date": types.Schema(type="STRING", description="Meeting date in YYYY-MM-DD format"),
                        "time": types.Schema(type="STRING", description="Meeting time in HH:MM format (24-hour)"),
                        "title": types.Schema(
                            type="STRING",
                            description="Optional meeting title or subject",
                        ),
                    },
                    required=["name", "date", "time"],
                ),
            )
        ]
    )
]


class GeminiLiveSession:
    """Manages a single Gemini Live API session with bidirectional audio streaming."""

    def __init__(self, on_audio: Any, on_transcript: Any, on_tool_call: Any, on_status: Any):
        self.on_audio = on_audio
        self.on_transcript = on_transcript
        self.on_tool_call = on_tool_call
        self.on_status = on_status
        self._session = None
        self._receive_task: Optional[asyncio.Task] = None
        self._running = False

    async def connect(self):
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not set in environment")

        client = genai.Client(api_key=settings.gemini_api_key)

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(
                parts=[types.Part(text=SYSTEM_INSTRUCTION)]
            ),
            tools=SCHEDULING_TOOLS,
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

        self._session = await client.aio.live.connect(
            model=settings.gemini_model,
            config=config,
        )
        self._running = True
        self._receive_task = asyncio.create_task(self._receive_loop())

        await self.on_status("connected")
        logger.info("Gemini Live session connected")

    async def send_audio(self, audio_b64: str):
        if not self._session or not self._running:
            return
        audio_bytes = base64.b64decode(audio_b64)
        await self._session.send_realtime_input(
            audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
        )

    async def _receive_loop(self):
        if not self._session:
            return

        try:
            async for response in self._session.receive():
                if not self._running:
                    break

                if response.server_content:
                    content = response.server_content

                    if content.model_turn and content.model_turn.parts:
                        for part in content.model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                await self.on_audio(audio_b64)

                    if content.input_transcription and content.input_transcription.text:
                        await self.on_transcript("user", content.input_transcription.text)

                    if content.output_transcription and content.output_transcription.text:
                        await self.on_transcript("assistant", content.output_transcription.text)

                if response.tool_call:
                    for fc in response.tool_call.function_calls:
                        logger.info(f"Tool call: {fc.name}({fc.args})")
                        result = await self.on_tool_call(fc.name, fc.args)
                        await self._session.send_tool_response(
                            function_responses=[
                                types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": result},
                                )
                            ]
                        )

        except Exception as e:
            logger.error(f"Gemini receive loop error: {e}")
        finally:
            await self.on_status("disconnected")

    async def disconnect(self):
        self._running = False
        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        if self._session:
            try:
                await self._session.close()
            except Exception:
                pass
            self._session = None
        logger.info("Gemini Live session disconnected")
