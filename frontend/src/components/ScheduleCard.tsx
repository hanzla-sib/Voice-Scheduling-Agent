import { motion, AnimatePresence } from "motion/react";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TitleIcon from "@mui/icons-material/Title";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export interface ScheduleInfo {
  name?: string;
  email?: string;
  date?: string;
  time?: string;
  title?: string;
  confirmed?: boolean;
  event_link?: string;
}

interface ScheduleCardProps {
  info: ScheduleInfo;
}

const fields = [
  { key: "name" as const, label: "Name", icon: PersonIcon },
  { key: "email" as const, label: "Email", icon: EmailIcon },
  { key: "date" as const, label: "Date", icon: CalendarTodayIcon },
  { key: "time" as const, label: "Time", icon: AccessTimeIcon },
  { key: "title" as const, label: "Title", icon: TitleIcon },
];

export function ScheduleCard({ info }: ScheduleCardProps) {
  const hasAnyInfo = fields.some((f) => info[f.key]);

  return (
    <AnimatePresence>
      {hasAnyInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className={`glass rounded-xl px-3 py-2.5 ${info.confirmed ? "border border-emerald-500/20" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Meeting Details</span>
              {info.confirmed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex items-center gap-1 text-emerald-400 text-[10px]"
                >
                  <CheckCircleIcon sx={{ fontSize: 12 }} />
                  Confirmed
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {fields.map((field) => {
                const Icon = field.icon;
                const value = info[field.key];
                if (!value) return null;
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 min-w-0"
                  >
                    <Icon sx={{ fontSize: 13 }} className="text-violet-400 flex-shrink-0" />
                    <span className="text-[11px] text-zinc-300 truncate" title={value}>
                      {value}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {info.event_link && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 pt-2 border-t border-zinc-800/50">
                <a
                  href={info.event_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                  Open in Google Calendar
                </a>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
