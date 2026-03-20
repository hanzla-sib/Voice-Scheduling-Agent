import { motion } from "motion/react";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";

interface MicButtonProps {
  isActive: boolean;
  isConnecting: boolean;
  onClick: () => void;
}

export function MicButton({ isActive, isConnecting, onClick }: MicButtonProps) {
  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <>
          <motion.div
            className="absolute rounded-full bg-violet-500/20"
            animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 140, height: 140 }}
          />
          <motion.div
            className="absolute rounded-full bg-violet-500/15"
            animate={{ scale: [1, 2.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            style={{ width: 140, height: 140 }}
          />
        </>
      )}

      <motion.button
        onClick={onClick}
        disabled={isConnecting}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isActive ? { boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)" } : {}}
        className={`
          relative z-10 flex items-center justify-center rounded-full
          w-20 h-20 cursor-pointer border-0 transition-colors duration-300
          ${isActive
            ? "bg-violet-600 text-white"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }
          ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isActive ? (
          <MicIcon sx={{ fontSize: 32 }} />
        ) : (
          <MicOffIcon sx={{ fontSize: 32 }} />
        )}
      </motion.button>
    </div>
  );
}
