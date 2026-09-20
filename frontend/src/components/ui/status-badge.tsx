import { Badge } from "@/components/ui/badge";
import { Circle, PlayCircle, CheckCircle2 } from "lucide-react";

export function StatusBadge({ status }: { status: "Open" | "In Progress" | "Closed" | string }) {
  if (status === "Open") {
    return (
      <Badge variant="outline" className="text-sky-400 border-sky-400/20 bg-sky-400/10 gap-1.5">
        <Circle className="w-3.5 h-3.5" />
        Open
      </Badge>
    );
  }
  if (status === "In Progress") {
    return (
      <Badge variant="outline" className="text-amber-400 border-amber-400/20 bg-amber-400/10 gap-1.5">
        <PlayCircle className="w-3.5 h-3.5" />
        In progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10 gap-1.5">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Closed
    </Badge>
  );
}
