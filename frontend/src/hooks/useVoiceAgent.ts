import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AudioCapture, AudioPlayer } from "@/lib/audio";
import type { TranscriptMessage } from "@/components/TranscriptPanel";
import type { ScheduleInfo } from "@/components/ScheduleCard";

function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (import.meta.env.DEV) return "ws://localhost:8000/ws/voice";
  return `${protocol}//${window.location.host}/ws/voice`;
}

const WS_URL = getWsUrl();
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1500;
const AUTO_STOP_AFTER_CONFIRM_MS = 7000;
const GOODBYE_REGEX = /\b(bye|goodbye|good day|have a great day|have a good day)\b/i;

interface ServerMessage {
  type: "audio" | "transcript" | "schedule_update" | "schedule_confirmed" | "schedule_error" | "status" | "error";
  data?: string | Record<string, string>;
  role?: "user" | "assistant";
  text?: string;
  status?: string;
  error?: string;
  function?: string;
}

let msgCounter = 0;

function extractScheduleHints(text: string, role: "user" | "assistant"): Partial<ScheduleInfo> {
  const hints: Partial<ScheduleInfo> = {};
  const lower = text.toLowerCase();

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) hints.email = emailMatch[0];

  const dateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (dateMatch) hints.date = dateMatch[1];

  const time24Match = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (time24Match && !emailMatch) {
    hints.time = `${time24Match[1].padStart(2, "0")}:${time24Match[2]}`;
  }

  if (!hints.time) {
    const time12Match = lower.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(a\.?m\.?|p\.?m\.?)\b/);
    if (time12Match) {
      const hour12 = Number(time12Match[1]);
      const minute = time12Match[2] ?? "00";
      const isPm = time12Match[3].startsWith("p");
      const hour24 = (hour12 % 12) + (isPm ? 12 : 0);
      hints.time = `${String(hour24).padStart(2, "0")}:${minute}`;
    }
  }

  if (role === "user") {
    const nameMatch = text.match(/\b(?:my name is|i am|i'm|this is|call me)\s+([A-Za-z][A-Za-z\s'-]{0,40})/i);
    if (nameMatch) hints.name = nameMatch[1].trim().replace(/[.,!?]+$/, "");
  } else {
    const confirmName = text.match(/\b(?:name is|heard)\s+([A-Z][A-Za-z\s'-]{0,40})/);
    if (confirmName) hints.name = confirmName[1].trim().replace(/[.,!?]+$/, "");
  }

  return hints;
}

export function useVoiceAgent() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo>({});

  const wsRef = useRef<WebSocket | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const intentionalStop = useRef(false);
  const reconnectAttempts = useRef(0);
  const isActiveRef = useRef(false);

  const pendingUserTranscript = useRef("");
  const pendingAssistantTranscript = useRef("");
  const userFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoStopAfterGoodbye = useRef(false);

  const flushTranscript = useCallback(
    (role: "user" | "assistant") => {
      const ref = role === "user" ? pendingUserTranscript : pendingAssistantTranscript;
      const text = ref.current.trim();
      if (!text) return;
      ref.current = "";
      setMessages((prev) => [
        ...prev,
        { id: `msg-${++msgCounter}`, role, text },
      ]);
    },
    []
  );

  const cleanupMedia = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
  }, []);

  const stopSession = useCallback(
    (flushPending = true) => {
      intentionalStop.current = true;
      isActiveRef.current = false;

      if (autoStopTimer.current) {
        clearTimeout(autoStopTimer.current);
        autoStopTimer.current = null;
      }
      shouldAutoStopAfterGoodbye.current = false;

      cleanupMedia();

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
        wsRef.current.close();
      }
      wsRef.current = null;

      if (flushPending) {
        flushTranscript("user");
        flushTranscript("assistant");
      }
      setIsActive(false);
    },
    [cleanupMedia, flushTranscript]
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const msg: ServerMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "audio":
          if (typeof msg.data === "string") {
            playerRef.current?.play(msg.data);
          }
          break;

        case "transcript": {
          const role = msg.role as "user" | "assistant";
          const text = msg.text || "";
          const hints = extractScheduleHints(text, role);
          if (Object.keys(hints).length > 0) {
            setScheduleInfo((prev) => ({ ...prev, ...hints }));
          }

          if (role === "user") {
            pendingUserTranscript.current += text;
            if (userFlushTimer.current) clearTimeout(userFlushTimer.current);
            userFlushTimer.current = setTimeout(() => flushTranscript("user"), 800);
          } else {
            pendingAssistantTranscript.current += text;
            if (assistantFlushTimer.current) clearTimeout(assistantFlushTimer.current);
            assistantFlushTimer.current = setTimeout(() => flushTranscript("assistant"), 800);
            if (shouldAutoStopAfterGoodbye.current && GOODBYE_REGEX.test(text)) {
              shouldAutoStopAfterGoodbye.current = false;
              setTimeout(() => stopSession(true), 400);
            }
          }
          break;
        }

        case "schedule_update":
          if (typeof msg.data === "object" && msg.data !== null) {
            setScheduleInfo((prev) => ({ ...prev, ...msg.data as Record<string, string> }));
          }
          break;

        case "schedule_confirmed":
          setScheduleInfo((prev) => ({
            ...prev,
            ...(typeof msg.data === "object" && msg.data !== null ? (msg.data as Record<string, string>) : {}),
            confirmed: true,
          }));
          shouldAutoStopAfterGoodbye.current = true;
          if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
          autoStopTimer.current = setTimeout(() => {
            if (shouldAutoStopAfterGoodbye.current) {
              stopSession(true);
            }
          }, AUTO_STOP_AFTER_CONFIRM_MS);
          toast.success("Meeting scheduled successfully!", {
            description: "Closing this session after farewell.",
          });
          break;

        case "schedule_error":
          toast.error("Failed to schedule meeting", {
            description: msg.error || "Please try again.",
          });
          break;

        case "error":
          toast.error("Connection error", {
            description: msg.error || "Failed to start voice session.",
          });
          break;

        case "status":
          if (msg.status === "connected") {
            reconnectAttempts.current = 0;
            toast.info("Voice agent connected");
          }
          break;
      }
    },
    [flushTranscript, stopSession]
  );

  const connectWs = useCallback(async (capture: AudioCapture): Promise<boolean> => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("WebSocket connection failed"));
        setTimeout(() => reject(new Error("Connection timeout")), 10000);
      });

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        if (!intentionalStop.current && isActiveRef.current) {
          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts.current++;
            console.log(`Connection lost, reconnecting (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(() => {
              if (isActiveRef.current && captureRef.current) {
                connectWs(captureRef.current).then((ok) => {
                  if (!ok) {
                    cleanupMedia();
                    setIsActive(false);
                    isActiveRef.current = false;
                    toast.error("Connection lost", { description: "Could not reconnect. Tap the mic to try again." });
                  }
                });
              }
            }, RECONNECT_DELAY_MS);
          } else {
            cleanupMedia();
            setIsActive(false);
            isActiveRef.current = false;
            toast.error("Connection lost", { description: "Could not reconnect. Tap the mic to try again." });
          }
        }
      };

      const browserLanguage =
        (Array.isArray(navigator.languages) && navigator.languages.length > 0
          ? navigator.languages[0]
          : navigator.language) || "en-US";
      ws.send(JSON.stringify({ type: "start", language: browserLanguage }));

      capture.onAudioData = (b64) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "audio", data: b64 }));
        }
      };

      return true;
    } catch {
      return false;
    }
  }, [handleMessage, cleanupMedia]);

  const start = useCallback(async () => {
    setIsConnecting(true);
    intentionalStop.current = false;
    reconnectAttempts.current = 0;

    try {
      const player = new AudioPlayer();
      playerRef.current = player;

      const capture = new AudioCapture();
      await capture.start();
      captureRef.current = capture;

      const ok = await connectWs(capture);
      if (!ok) {
        cleanupMedia();
        toast.error("Connection failed", {
          description: "Could not connect to the backend. Make sure the server is running on port 8000.",
        });
        return;
      }

      setIsActive(true);
      isActiveRef.current = true;
    } catch (err) {
      console.error("Failed to start voice agent:", err);
      cleanupMedia();
      toast.error("Connection failed", {
        description: "Could not connect to the backend. Make sure the server is running on port 8000.",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [connectWs, cleanupMedia]);

  const stop = useCallback(() => {
    stopSession(true);
  }, [stopSession]);

  const toggle = useCallback(() => {
    if (isActive || isActiveRef.current) {
      stop();
    } else {
      start();
    }
  }, [isActive, start, stop]);

  const startNewMeeting = useCallback(async () => {
    // Stop current session first (if running), then clear old state.
    if (isActiveRef.current || isActive) {
      stop();
    }

    if (userFlushTimer.current) clearTimeout(userFlushTimer.current);
    if (assistantFlushTimer.current) clearTimeout(assistantFlushTimer.current);
    if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    shouldAutoStopAfterGoodbye.current = false;
    pendingUserTranscript.current = "";
    pendingAssistantTranscript.current = "";

    msgCounter = 0;
    setMessages([]);
    setScheduleInfo({});

    await start();
  }, [isActive, start, stop]);

  return {
    isActive,
    isConnecting,
    messages,
    scheduleInfo,
    toggle,
    startNewMeeting,
  };
}
