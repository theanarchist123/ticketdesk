import { formatDistanceToNow, format } from "date-fns";

export function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "MMM d, yyyy h:mm a");
}

export function formatTimeLeft(dueAtIso: string, now: Date): string {
  const due = new Date(dueAtIso).getTime();
  const nowMs = now.getTime();
  
  if (nowMs >= due) {
    const overdueMs = nowMs - due;
    const hours = Math.floor(overdueMs / (1000 * 60 * 60));
    const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    return `-${hours}h ${mins}m`;
  }
  
  const remainingMs = due - nowMs;
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}
