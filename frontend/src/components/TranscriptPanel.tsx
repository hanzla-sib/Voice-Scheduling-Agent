import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";

export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
}

export function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin">
      <AnimatePresence mode="popLayout">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <SmartToyIcon sx={{ fontSize: 40 }} className="text-zinc-700" />
            </motion.div>
            <p className="text-zinc-600 text-sm text-center">
              Tap the microphone to start a conversation
            </p>
            <p className="text-zinc-700 text-xs text-center">
              I'll help you schedule a meeting step by step
            </p>
          </motion.div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`
                flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5
                ${msg.role === "user"
                  ? "bg-violet-600/20"
                  : "bg-zinc-700/50"
                }
              `}
            >
              {msg.role === "user" ? (
                <PersonIcon sx={{ fontSize: 15 }} className="text-violet-400" />
              ) : (
                <SmartToyIcon sx={{ fontSize: 15 }} className="text-zinc-400" />
              )}
            </div>

            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <span className="text-[10px] font-medium tracking-wide uppercase text-zinc-600 px-1">
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
              <div
                className={`
                  rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-violet-600/90 text-white rounded-tr-sm"
                    : "glass-light text-zinc-200 rounded-tl-sm"
                  }
                `}
              >
                {msg.text}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
