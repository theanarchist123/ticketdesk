import { motion } from "motion/react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type SLAState = "on_track" | "at_risk" | "overdue" | "resolved";

interface SLARingProps {
  state: SLAState;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const config = {
  sm: { size: 24, strokeWidth: 3 },
  md: { size: 36, strokeWidth: 4 },
  lg: { size: 48, strokeWidth: 5 },
};

const stateConfig = {
  on_track: {
    color: "text-emerald-500",
    bgColor: "text-emerald-500/20",
    pulse: false,
    icon: Clock,
  },
  at_risk: {
    color: "text-amber-500",
    bgColor: "text-amber-500/20",
    pulse: true,
    icon: Clock,
  },
  overdue: {
    color: "text-rose-500",
    bgColor: "text-rose-500/20",
    pulse: true,
    icon: Clock,
  },
  resolved: {
    color: "text-neutral-400",
    bgColor: "text-neutral-400/20",
    pulse: false,
    icon: Check,
  },
};

export function SLARing({ state, size = "md", className }: SLARingProps) {
  const { size: svgSize, strokeWidth } = config[size];
  const { color, bgColor, pulse, icon: Icon } = stateConfig[state];

  const radius = (svgSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="transform -rotate-90"
      >
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          className={cn("fill-none", bgColor)}
          strokeWidth={strokeWidth}
          stroke="currentColor"
        />
        <motion.circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          className={cn("fill-none", color)}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: state === "resolved" ? 0 : circumference * 0.25,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      
      {pulse && state !== "resolved" && (
        <motion.div
          className={cn("absolute inset-0 rounded-full border-2", color)}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{
            duration: state === "overdue" ? 1 : 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}

      <div className={cn("absolute flex items-center justify-center", color)}>
        <Icon
          size={size === "sm" ? 12 : size === "md" ? 16 : 20}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
}
