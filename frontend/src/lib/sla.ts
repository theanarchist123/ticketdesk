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
