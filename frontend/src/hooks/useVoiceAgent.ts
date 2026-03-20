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

interface ServerMessage {
  type: "audio" | "transcript" | "schedule_update" | "schedule_confirmed" | "schedule_error" | "status";
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
            description: `Your meeting has been added to the calendar.`,
          });
          break;

        case "schedule_error":
          toast.error("Failed to schedule meeting", {
            description: msg.error || "Please try again.",
          });
          break;

        case "status":
          if (msg.status === "connected") {
            toast.info("Voice agent connected");
          } else if (msg.status === "disconnected") {
            setIsActive(false);
          }
          break;
      }
    },
    [flushTranscript]
  );

  const start = useCallback(async () => {
    setIsConnecting(true);
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("WebSocket connection failed"));
      });

      ws.onmessage = handleMessage;
      ws.onclose = () => {
        setIsActive(false);
        captureRef.current?.stop();
      };

      ws.send(JSON.stringify({ type: "start" }));

      const player = new AudioPlayer();
      playerRef.current = player;

      const capture = new AudioCapture();
      capture.onAudioData = (b64) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "audio", data: b64 }));
        }
      };
      await capture.start();
      captureRef.current = capture;

      setIsActive(true);
    } catch (err) {
      console.error("Failed to start voice agent:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [handleMessage]);

  const stop = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      wsRef.current.close();
    }
    wsRef.current = null;

    flushTranscript("user");
    flushTranscript("assistant");
    setIsActive(false);
  }, [flushTranscript]);

  const toggle = useCallback(() => {
    if (isActive) {
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
