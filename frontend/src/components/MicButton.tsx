import { motion, AnimatePresence } from "motion/react";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import { AudioVisualizer } from "./AudioVisualizer";

interface MicButtonProps {
  isActive: boolean;
  isConnecting: boolean;
  onClick: () => void;
}

export function MicButton({ isActive, isConnecting, onClick }: MicButtonProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          {isActive && (
            <>
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 160,
                  height: 160,
                  background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 160,
                  height: 160,
                  background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)",
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
              <motion.div
                className="absolute rounded-full border border-violet-500/20"
                style={{ width: 110, height: 110 }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: 360 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, default: { duration: 0.3 } }}
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={onClick}
          disabled={isConnecting}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={`
            relative z-10 flex items-center justify-center rounded-full
            w-24 h-24 cursor-pointer border-0 transition-all duration-500 shadow-lg
            ${isActive
              ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-violet-500/30"
              : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-white shadow-black/20"
            }
            ${isConnecting ? "opacity-60 cursor-not-allowed animate-pulse" : ""}
          `}
        >
          <motion.div
            animate={isActive ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            {isActive ? (
              <MicIcon sx={{ fontSize: 36 }} />
            ) : (
              <MicOffIcon sx={{ fontSize: 36 }} />
            )}
          </motion.div>
        </motion.button>
      </div>

      <AudioVisualizer isActive={isActive} />

      <motion.p
        className="text-xs text-zinc-500"
        animate={{ opacity: isActive ? 0 : 1 }}
      >
        {isConnecting ? "Connecting..." : "Tap to start"}
      </motion.p>
    </div>
  );
}
