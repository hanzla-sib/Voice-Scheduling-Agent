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

SYSTEM_INSTRUCTION = """You are a friendly and professional voice scheduling assistant. Your job is to help users schedule meetings on the host's Google Calendar.

Follow this conversation flow strictly — after EACH step, repeat back what you heard and ask the user to confirm it is correct before moving on:

1. Greet the user warmly and ask for their name.
   → Repeat the name back: "I heard your name is John Smith, is that correct?"
   → Wait for confirmation. If wrong, ask again.

2. Ask for their email address.
   → Spell the email back character by character: "That's j-o-h-n at gmail dot com, correct?"
   → Wait for confirmation. If wrong, ask them to repeat it.

3. Ask what date they'd like to schedule the meeting.
   → Repeat the date back: "So that's March 25th, 2026 — is that right?"
   → Wait for confirmation.

4. Ask for their preferred time.
   → Repeat the time back: "Got it, 3:00 PM. Is that correct?"
   → Wait for confirmation.

5. Optionally ask if they'd like to add a meeting title/subject. If they decline, that's fine.
   → If given, repeat the title back and confirm.

6. Summarize ALL collected details back to the user clearly and ask for final confirmation (e.g. "Here's everything: Name: John, Email: john@gmail.com, Date: 2026-03-25, Time: 15:00, Title: Product Sync. Should I go ahead and schedule it?").

7. ONLY after the user explicitly confirms, call the `create_calendar_event` function.

8. After the function succeeds, tell the user the meeting has been scheduled and they'll receive a calendar invite at their email.

9. End with a short farewell like "Goodbye, have a great day!" and nothing more.

Important rules:
- Keep each response to 1-2 sentences since this is a voice conversation.
- After EACH piece of information, repeat it back to the user and wait for their "yes" or correction.
- When the user says a date like "next Monday" or "tomorrow", convert it to YYYY-MM-DD format. Today's date is important for this.
- Convert times to 24-hour HH:MM format (e.g. "3pm" becomes "15:00").
- NEVER call the function until the user explicitly confirms the final summary.
- If the user wants to change something, accommodate it, repeat back the change, and re-confirm.
- Be natural, warm, and conversational.
- When asking for an email, if the user spells it out (e.g. "john at gmail dot com"), convert it to the proper format (john@gmail.com).
- CRITICAL: Always speak and respond ONLY in English. Use only English words and Latin/ASCII characters. Never use Hindi, Urdu, Devanagari, or any non-Latin script in your responses, regardless of how the user's speech sounds. Even if the user has an accent, always respond in plain English."""

SCHEDULING_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="create_calendar_event",
                description="Creates a calendar event and sends an invite to the user's email.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "name": types.Schema(type="STRING", description="The user's name"),
                        "email": types.Schema(type="STRING", description="The user's email address for the calendar invite"),
                        "date": types.Schema(type="STRING", description="Meeting date in YYYY-MM-DD format"),
                        "time": types.Schema(type="STRING", description="Meeting time in HH:MM format (24-hour)"),
                        "title": types.Schema(
                            type="STRING",
                            description="Optional meeting title or subject",
                        ),
                    },
                    required=["name", "email", "date", "time"],
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
        self._ctx_manager = None
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

        self._ctx_manager = client.aio.live.connect(
            model=settings.gemini_model,
            config=config,
        )
        self._session = await self._ctx_manager.__aenter__()
        self._running = True
        self._receive_task = asyncio.create_task(self._receive_loop())

        # Trigger the first assistant turn so the AI greets immediately.
        await self._session.send_client_content(
            turns=[
                types.Content(
                    role="user",
                    parts=[types.Part(text="Start now. Greet me first in one short sentence.")],
                )
            ],
            turn_complete=True,
        )

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
            while self._running:
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

                except StopAsyncIteration:
                    pass

                if self._running:
                    logger.debug("Receive iterator ended, re-entering receive loop")
                    await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Gemini receive loop error: {e}")
        finally:
            if self._running:
                await self.on_status("disconnected")

    async def disconnect(self):
        self._running = False
        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        if self._ctx_manager:
            try:
                await self._ctx_manager.__aexit__(None, None, None)
            except Exception:
                pass
            self._ctx_manager = None
            self._session = None
        logger.info("Gemini Live session disconnected")
