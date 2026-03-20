import { motion } from "motion/react";

interface AudioVisualizerProps {
  isActive: boolean;
}

export function AudioVisualizer({ isActive }: AudioVisualizerProps) {
  const bars = 5;
  const delays = [0, 0.15, 0.3, 0.15, 0];

  return (
    <div className="flex items-center justify-center gap-[3px] h-6">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-violet-400"
          animate={
            isActive
              ? {
                  height: [4, 18 + Math.random() * 6, 4],
                  opacity: [0.5, 1, 0.5],
                }
              : { height: 4, opacity: 0.3 }
          }
          transition={
            isActive
              ? {
                  duration: 0.6 + Math.random() * 0.3,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                  delay: delays[i],
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
