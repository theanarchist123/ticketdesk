import { formatDistanceToNow, format } from "date-fns";

export function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "MMM d, yyyy h:mm a");
}

export function formatTimeLeft(dueAtIso: string, now: Date, status?: string): string {
  if (status === "Closed") {
    return "Resolved";
  }

  const due = new Date(dueAtIso).getTime();
  const nowMs = now.getTime();
  
  const diffMs = due - nowMs;
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  
  const totalMinutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  let formatted = "";
  if (totalMinutes < 60) {
    formatted = `${totalMinutes}m`;
  } else if (hours < 48) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${days}d ${remainingHours}h`;
  }
  
  return isOverdue ? `${formatted} overdue` : `Due in ${formatted}`;
}
