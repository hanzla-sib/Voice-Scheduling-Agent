import { motion, AnimatePresence } from "motion/react";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";

interface MicButtonProps {
  isActive: boolean;
  isConnecting: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}

const sizes = {
  sm: { btn: "w-14 h-14", icon: 24, ring: 72, pulse: 90 },
  md: { btn: "w-20 h-20", icon: 32, ring: 100, pulse: 130 },
};

export function MicButton({ isActive, isConnecting, onClick, size = "md" }: MicButtonProps) {
  const s = sizes[size];

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div
              className="absolute rounded-full"
              style={{
                width: s.pulse,
                height: s.pulse,
                background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute rounded-full border border-violet-500/20"
              style={{ width: s.ring, height: s.ring }}
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
        whileHover={{ scale: 1.08, boxShadow: "0 0 35px rgba(139,92,246,0.45)" }}
        whileTap={{ scale: 0.92 }}
        className={`
          relative z-10 flex items-center justify-center rounded-full cursor-pointer
          border border-white/10 transition-all duration-500 shadow-lg ${s.btn}
          ${isActive
            ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-violet-500/30"
            : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-white shadow-black/20"
          }
          ${isConnecting ? "opacity-60 cursor-not-allowed animate-pulse" : ""}
        `}
      >
        {isActive ? (
          <MicIcon sx={{ fontSize: s.icon }} />
        ) : (
          <MicOffIcon sx={{ fontSize: s.icon }} />
        )}
      </motion.button>
    </div>
  );
}
