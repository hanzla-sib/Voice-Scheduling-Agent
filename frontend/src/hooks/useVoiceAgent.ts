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
          if (role === "user") {
            pendingUserTranscript.current += text;
            if (userFlushTimer.current) clearTimeout(userFlushTimer.current);
            userFlushTimer.current = setTimeout(() => flushTranscript("user"), 800);
          } else {
            pendingAssistantTranscript.current += text;
            if (assistantFlushTimer.current) clearTimeout(assistantFlushTimer.current);
            assistantFlushTimer.current = setTimeout(() => flushTranscript("assistant"), 800);
          }
          break;
        }

        case "schedule_update":
          if (typeof msg.data === "object" && msg.data !== null) {
            setScheduleInfo((prev) => ({ ...prev, ...msg.data as Record<string, string> }));
          }
          break;

        case "schedule_confirmed":
          setScheduleInfo((prev) => ({ ...prev, confirmed: true }));
          toast.success("Meeting scheduled successfully!", {
            description: "Your meeting has been added to the calendar.",
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
    [flushTranscript]
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

      ws.send(JSON.stringify({ type: "start" }));

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
    intentionalStop.current = true;
    isActiveRef.current = false;
    cleanupMedia();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      wsRef.current.close();
    }
    wsRef.current = null;

    flushTranscript("user");
    flushTranscript("assistant");
    setIsActive(false);
  }, [flushTranscript, cleanupMedia]);

  const toggle = useCallback(() => {
    if (isActive || isActiveRef.current) {
      stop();
    } else {
      start();
    }
  }, [isActive, start, stop]);

  return {
    isActive,
    isConnecting,
    messages,
    scheduleInfo,
    toggle,
  };
}
