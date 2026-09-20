import { ChevronsUp, ChevronUp, Minus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PriorityMarkProps {
  priority: "Urgent" | "High" | "Medium" | "Low" | string;
  className?: string;
  size?: number;
}

export function PriorityMark({ priority, className, size = 16 }: PriorityMarkProps) {
  if (priority === "Urgent") {
    return <ChevronsUp size={size} className={cn("text-[var(--td-urgent)]", className)} strokeWidth={2.5} />;
  }
  if (priority === "High") {
    return <ChevronUp size={size} className={cn("text-[var(--td-high)]", className)} strokeWidth={2.5} />;
  }
  if (priority === "Medium") {
    return <Minus size={size} className={cn("text-[var(--td-muted)]", className)} strokeWidth={2.5} />;
  }
  return <ChevronDown size={size} className={cn("text-[var(--td-muted)]", className)} strokeWidth={2.5} />;
}
