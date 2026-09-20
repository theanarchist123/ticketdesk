import { Badge } from "@/components/ui/badge";
import { Circle, PlayCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: "Open" | "In Progress" | "Closed" | string, className?: string }) {
  if (status === "Open") {
    return (
      <Badge variant="outline" className={cn("text-[var(--td-status-open)] border-[var(--td-status-open)]/20 bg-[var(--td-status-open)]/10 gap-1.5 font-normal rounded-full", className)}>
        <Circle className="w-3.5 h-3.5" />
        Open
      </Badge>
    );
  }
  if (status === "In Progress") {
    return (
      <Badge variant="outline" className={cn("text-[var(--td-status-in-progress)] border-[var(--td-status-in-progress)]/20 bg-[var(--td-status-in-progress)]/10 gap-1.5 font-normal rounded-full", className)}>
        <PlayCircle className="w-3.5 h-3.5" />
        In progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-[var(--td-status-closed)] border-[var(--td-status-closed)]/20 bg-[var(--td-status-closed)]/10 gap-1.5 font-normal rounded-full", className)}>
      <CheckCircle2 className="w-3.5 h-3.5" />
      Closed
    </Badge>
  );
}
