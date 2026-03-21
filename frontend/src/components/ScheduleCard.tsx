import { motion, AnimatePresence } from "motion/react";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TitleIcon from "@mui/icons-material/Title";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  const filledCount = fields.filter((f) => info[f.key]).length;
  const progress = (filledCount / fields.length) * 100;

  return (
    <AnimatePresence>
      {hasAnyInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className={`glass border-zinc-800/50 overflow-hidden ${info.confirmed ? "border-emerald-500/20" : ""}`}>
            {/* Progress bar */}
            <div className="h-0.5 bg-zinc-800 w-full">
              <motion.div
                className={`h-full ${info.confirmed ? "bg-emerald-500" : "bg-violet-500"}`}
                initial={{ width: 0 }}
                animate={{ width: `${info.confirmed ? 100 : progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm font-medium tracking-wide">
                  Meeting Details
                </CardTitle>
                <AnimatePresence>
                  {info.confirmed ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs gap-1">
                        <CheckCircleIcon sx={{ fontSize: 12 }} />
                        Confirmed
                      </Badge>
                    </motion.div>
                  ) : (
                    <span className="text-[10px] text-zinc-600">
                      {filledCount}/{fields.length} collected
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </CardHeader>

            <Separator className="bg-zinc-800/50" />

            <CardContent className="pt-4 pb-4">
              <div className="grid gap-3">
                {fields.map((field, i) => {
                  const Icon = field.icon;
                  const value = info[field.key];
                  return (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`
                          w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                          ${value ? "bg-violet-500/10" : "bg-zinc-800/50"}
                        `}
                      >
                        <Icon
                          sx={{ fontSize: 15 }}
                          className={value ? "text-violet-400" : "text-zinc-700"}
                        />
                      </div>
                      <span className="text-zinc-500 text-xs w-12 flex-shrink-0">{field.label}</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={value || "empty"}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className={`text-sm font-medium ${value ? "text-white" : "text-zinc-700"}`}
                        >
                          {value || "—"}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Calendar link */}
              <AnimatePresence>
                {info.event_link && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <Separator className="bg-zinc-800/50 mb-4" />
                    <a
                      href={info.event_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                      Open in Google Calendar
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
