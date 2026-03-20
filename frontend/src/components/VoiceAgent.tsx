import { motion } from "motion/react";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { MicButton } from "./MicButton";
import { TranscriptPanel } from "./TranscriptPanel";
import { ScheduleCard } from "./ScheduleCard";
import { Badge } from "@/components/ui/badge";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

export function VoiceAgent() {
  const { isActive, isConnecting, messages, scheduleInfo, toggle } = useVoiceAgent();

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-900/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-900/8 blur-[100px]" />
        <motion.div
          className="absolute top-[30%] right-[20%] w-[200px] h-[200px] rounded-full bg-violet-800/5 blur-[80px]"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-5 py-8 flex flex-col min-h-screen">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <motion.div
            className="inline-flex items-center gap-2.5 mb-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <EventNoteIcon sx={{ fontSize: 20 }} className="text-violet-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Voice Scheduler
            </h1>
          </motion.div>

          <p className="text-zinc-500 text-sm mb-4">
            Speak naturally to schedule your meetings
          </p>

          <Badge
            variant="outline"
            className={`text-[11px] px-3 py-1 transition-all duration-500 ${
              isActive
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                : isConnecting
                ? "border-amber-500/30 text-amber-400 bg-amber-500/5"
                : "border-zinc-800 text-zinc-600 bg-zinc-900/50"
            }`}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                isActive
                  ? "bg-emerald-400 animate-pulse"
                  : isConnecting
                  ? "bg-amber-400 animate-pulse"
                  : "bg-zinc-700"
              }`}
            />
            {isActive ? "Listening..." : isConnecting ? "Connecting..." : "Ready"}
          </Badge>
        </motion.div>

        {/* Mic Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="flex justify-center mb-10"
        >
          <MicButton
            isActive={isActive}
            isConnecting={isConnecting}
            onClick={toggle}
          />
        </motion.div>

        {/* Transcript */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          className="flex-1 mb-6"
        >
          <div className="glass rounded-2xl p-5 min-h-[200px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-violet-500" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Conversation
              </span>
            </div>
            <TranscriptPanel messages={messages} />
          </div>
        </motion.div>

        {/* Schedule Info */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          className="pb-8"
        >
          <ScheduleCard info={scheduleInfo} />
        </motion.div>
      </div>
    </div>
  );
}
