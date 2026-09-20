import type { SLAState } from "./types";

export const SLA_HOURS: Record<string, number> = {
  Urgent: 4,
  High: 8,
  Medium: 24,
  Low: 48,
};

export function computeFrontendSlaState(
  status: string,
  dueAtIso: string,
  _createdAtIso: string,
  priority: string,
  now: Date
): SLAState {
  if (status === "Closed") return "resolved";

  const dueAt = new Date(dueAtIso).getTime();
  const nowMs = now.getTime();

  if (nowMs >= dueAt) return "overdue";

  const windowMs = SLA_HOURS[priority] * 60 * 60 * 1000;
  const remainingMs = dueAt - nowMs;
  
  if (remainingMs < windowMs * 0.25) return "at_risk";
  return "on_track";
}

export function getSlaColor(state: SLAState): string {
  switch (state) {
    case "on_track":
      return "text-muted-foreground";
    case "at_risk":
      return "text-orange-500";
    case "overdue":
      return "text-rose-500";
    case "resolved":
      return "text-emerald-500";
    default:
      return "text-muted-foreground";
  }
}
