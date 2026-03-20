import { motion, AnimatePresence } from "motion/react";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TitleIcon from "@mui/icons-material/Title";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface ScheduleInfo {
  name?: string;
  date?: string;
  time?: string;
  title?: string;
  confirmed?: boolean;
}

interface ScheduleCardProps {
  info: ScheduleInfo;
}

const fields = [
  { key: "name" as const, label: "Name", icon: PersonIcon },
  { key: "date" as const, label: "Date", icon: CalendarTodayIcon },
  { key: "time" as const, label: "Time", icon: AccessTimeIcon },
  { key: "title" as const, label: "Meeting Title", icon: TitleIcon },
];

export function ScheduleCard({ info }: ScheduleCardProps) {
  const hasAnyInfo = fields.some((f) => info[f.key]);

  return (
    <AnimatePresence>
      {hasAnyInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base">Meeting Details</CardTitle>
                {info.confirmed && (
                  <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                    <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    Confirmed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <Separator className="bg-zinc-800" />
            <CardContent className="pt-4">
              <div className="grid gap-3">
                {fields.map((field) => {
                  const Icon = field.icon;
                  const value = info[field.key];
                  return (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: value ? 1 : 0.4, x: 0 }}
                      className="flex items-center gap-3"
                    >
                      <Icon
                        sx={{ fontSize: 18 }}
                        className={value ? "text-violet-400" : "text-zinc-600"}
                      />
                      <span className="text-zinc-500 text-sm w-28">{field.label}</span>
                      <span className={`text-sm ${value ? "text-white" : "text-zinc-600"}`}>
                        {value || "Waiting..."}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
