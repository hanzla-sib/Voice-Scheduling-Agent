import { motion } from "motion/react";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { MicButton } from "./MicButton";
import { TranscriptPanel } from "./TranscriptPanel";
import { ScheduleCard } from "./ScheduleCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

export function VoiceAgent() {
  const { isActive, isConnecting, messages, scheduleInfo, toggle } = useVoiceAgent();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col min-h-screen">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <EventNoteIcon sx={{ fontSize: 28 }} className="text-violet-400" />
            <h1 className="text-2xl font-semibold tracking-tight">Voice Scheduler</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Speak naturally to schedule your meetings
          </p>
          <Badge
            variant="outline"
            className={`mt-3 text-xs ${
              isActive
                ? "border-emerald-500/50 text-emerald-400"
                : isConnecting
                ? "border-amber-500/50 text-amber-400"
                : "border-zinc-700 text-zinc-500"
            }`}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                isActive
                  ? "bg-emerald-400 animate-pulse"
                  : isConnecting
                  ? "bg-amber-400 animate-pulse"
                  : "bg-zinc-600"
              }`}
            />
            {isActive ? "Listening..." : isConnecting ? "Connecting..." : "Inactive"}
          </Badge>
        </motion.div>

        {/* Mic Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <MicButton
            isActive={isActive}
            isConnecting={isConnecting}
            onClick={toggle}
          />
        </motion.div>

        {/* Transcript */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex-1 mb-6"
        >
          <Card className="bg-zinc-900/50 border-zinc-800 h-full">
            <CardContent className="p-4">
              <TranscriptPanel messages={messages} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <ScheduleCard info={scheduleInfo} />
        </motion.div>
      </div>
    </div>
  );
}
