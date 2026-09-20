import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { computeFrontendSlaState, SLA_HOURS } from "@/lib/sla";

export interface SlaRingProps {
  dueAt: string;
  createdAt: string;
  status: string;
  priority: string;
  size?: "sm" | "lg";
  animate?: boolean;
  className?: string;
}

const stateConfig = {
  on_track: {
    color: "text-[var(--td-sla-on-track)]",
    pulse: false,
  },
  at_risk: {
    color: "text-[var(--td-sla-at-risk)]",
    pulse: true,
  },
  overdue: {
    color: "text-[var(--td-sla-overdue)]",
    pulse: true,
  },
  resolved: {
    color: "text-[var(--td-sla-resolved)]",
    pulse: false,
  },
};

export function SlaRing({ dueAt, createdAt, status, priority, size = "sm", animate = true, className }: SlaRingProps) {
  const now = useNow(30000); // tick every 30s
  const state = computeFrontendSlaState(status, dueAt, createdAt, priority, now);
  
  const { color, pulse } = stateConfig[state];
  const shouldAnimate = animate && state !== "resolved";

  if (size === "sm") {
    // Solid dot when animate=false (e.g. used in the preview perhaps? actually the spec says "solid circle (dot) if animate=false")
    if (!animate) {
      // replace text- with bg-
      const bgColor = color.replace("text-", "bg-");
      return (
        <div className={cn("w-2 h-2 rounded-full shrink-0", bgColor, className)} />
      );
    }

    // 20px ring
    return (
      <div className={cn("relative inline-flex items-center justify-center shrink-0 w-5 h-5", color, className)}>
        <svg width="20" height="20" viewBox="0 0 20 20" className="transform -rotate-90">
          <circle cx="10" cy="10" r="8" className="fill-none stroke-current opacity-20" strokeWidth="2.5" />
          <motion.circle 
            cx="10" cy="10" r="8" 
            className="fill-none stroke-current" 
            strokeWidth="2.5" 
            strokeDasharray={8 * 2 * Math.PI}
            initial={{ strokeDashoffset: 8 * 2 * Math.PI }}
            animate={{ strokeDashoffset: state === "resolved" ? 0 : (8 * 2 * Math.PI) * 0.25 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        {pulse && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-current"
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: state === "overdue" ? 1 : 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </div>
    );
  }

  // Large 160px ring for the detail panel
  const totalWindowMs = (SLA_HOURS[priority] || 24) * 3600000;
  const elapsedMs = now.getTime() - new Date(createdAt).getTime();
  const rawRatio = elapsedMs / totalWindowMs;
  const ratio = Math.max(0, Math.min(1, rawRatio)); // clamp 0-1
  
  const radius = 76;
  const circumference = radius * 2 * Math.PI;
  // If resolved, we can just show a full ring
  const offset = state === "resolved" ? 0 : circumference * (1 - ratio);

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 w-[160px] h-[160px]", color, className)}>
      <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
        <circle cx="80" cy="80" r={radius} className="fill-none stroke-current opacity-20" strokeWidth="6" />
        
        {state === "on_track" && (
           <circle cx="80" cy="80" r={radius} className="fill-none stroke-current opacity-[0.15]" strokeWidth="12" filter="blur(6px)" />
        )}
        
        <motion.circle
          cx="80" cy="80" r={radius}
          className="fill-none stroke-current"
          strokeWidth="6"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
        />
      </svg>
    </div>
  );
}
