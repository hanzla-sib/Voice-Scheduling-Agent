import { motion, AnimatePresence } from "motion/react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import AddIcon from "@mui/icons-material/Add";
import { MicButton } from "./MicButton";
import { TranscriptPanel } from "./TranscriptPanel";
import { ScheduleCard } from "./ScheduleCard";
import { AudioVisualizer } from "./AudioVisualizer";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

export function VoiceAgent() {
  const { isActive, isConnecting, messages, scheduleInfo, toggle, startNewMeeting } = useVoiceAgent();
  const steps = [
    { key: "name", label: "Name", done: Boolean(scheduleInfo.name) },
    { key: "email", label: "Email", done: Boolean(scheduleInfo.email) },
    { key: "date", label: "Date", done: Boolean(scheduleInfo.date) },
    { key: "time", label: "Time", done: Boolean(scheduleInfo.time) },
    { key: "confirm", label: "Scheduled", done: Boolean(scheduleInfo.confirmed) },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="h-screen bg-zinc-950 text-white relative overflow-hidden flex flex-col">
      {/* Aurora background */}
      <div className="aurora-layer" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-900/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-900/8 blur-[100px]" />
      </div>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-md mx-auto w-full px-4 py-3 flex flex-col h-screen overflow-hidden gap-3">

        {/* ── Top bar: Brand + Mic + Status ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-shrink-0 glass shimmer-border rounded-2xl px-4 py-3 flex items-center gap-3"
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/25 to-indigo-500/25 border border-violet-400/20 flex items-center justify-center flex-shrink-0">
              <span className="text-violet-300 font-bold text-xs">AZ</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-zinc-100 leading-tight truncate">
                Calendar Scheduler Agent
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-violet-400/70">
                <AutoAwesomeIcon sx={{ fontSize: 10 }} />
                <span>Voice AI Agent</span>
              </div>
            </div>
          </div>

          {/* Mic + Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <MicButton isActive={isActive} isConnecting={isConnecting} onClick={toggle} size="sm" />
              <AnimatePresence mode="wait">
                {isActive ? (
                  <motion.div key="viz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AudioVisualizer isActive={isActive} />
                  </motion.div>
                ) : (
                  <motion.p
                    key="label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] text-zinc-500"
                  >
                    {isConnecting ? "Connecting..." : "Tap mic"}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${
                isActive ? "bg-emerald-400 animate-pulse" : isConnecting ? "bg-amber-400 animate-pulse" : "bg-zinc-700"
              }`}
              title={isActive ? "Listening" : isConnecting ? "Connecting" : "Ready"}
            />
          </div>
        </motion.div>

        {/* ── Steps progress bar ── */}
        {/* <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex-shrink-0 glass rounded-xl px-3 py-2.5"
        >
          <div className="flex items-center gap-1.5">
            {steps.map((step, i) => {
              const isCurrent = !step.done && (i === 0 || steps[i - 1].done);
              return (
                <div key={step.key} className="flex items-center gap-1.5 flex-1 min-w-0">
                  {i > 0 && (
                    <div className={`h-px flex-1 transition-colors duration-500 ${steps[i - 1].done ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
                  )}
                  <div className="flex flex-col items-center gap-0.5">
                    <motion.div
                      animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                      transition={isCurrent ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                    >
                      {step.done ? (
                        <CheckCircleIcon sx={{ fontSize: 16 }} className="text-emerald-400" />
                      ) : (
                        <RadioButtonUncheckedIcon
                          sx={{ fontSize: 16 }}
                          className={isCurrent ? "text-violet-400" : "text-zinc-700"}
                        />
                      )}
                    </motion.div>
                    <span className={`text-[8px] leading-tight text-center ${
                      step.done ? "text-emerald-300" : isCurrent ? "text-violet-300" : "text-zinc-600"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 h-[3px] bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${scheduleInfo.confirmed ? "bg-emerald-500" : "bg-violet-500"}`}
              animate={{ width: `${(doneCount / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div> */}

        {/* ── Conversation ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 min-h-0"
        >
          <div className="glass shimmer-border rounded-2xl p-4 h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <div className="w-1 h-3.5 rounded-full bg-violet-500" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                Conversation
              </span>
              {messages.length > 0 && (
                <span className="text-[9px] text-zinc-600 ml-auto">{messages.length} messages</span>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TranscriptPanel messages={messages} />
            </div>
          </div>
        </motion.div>

        {/* ── Schedule card + new meeting ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex-shrink-0"
        >
          <ScheduleCard info={scheduleInfo} />
          <AnimatePresence>
            {scheduleInfo.confirmed && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                onClick={() => { void startNewMeeting(); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 w-full rounded-xl border border-violet-400/20 bg-violet-500/10 hover:bg-violet-500/15 text-violet-200 text-xs font-medium px-3 py-2 flex items-center justify-center gap-1.5 transition-colors"
              >
                <AddIcon sx={{ fontSize: 14 }} />
                New Meeting
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
