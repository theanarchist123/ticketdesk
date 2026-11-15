import type { TicketListItem } from "./types";
import { computeFrontendSlaState } from "./sla";

const DAY = 86_400_000;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export interface DayPoint { label: string; value: number; date: Date }

/** Tickets created per day for the last `days` days (oldest -> newest). */
export function perDay(tickets: TicketListItem[], days: number, offsetDays = 0): DayPoint[] {
  const today = startOfDay(new Date());
  const out: DayPoint[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getTime() - (days - 1 - i + offsetDays) * DAY);
    return { date, value: 0, label: date.toLocaleDateString("en", { month: "short", day: "numeric" }) };
  });
  const first = out[0].date.getTime();
  const last = out[out.length - 1].date.getTime() + DAY;
  for (const t of tickets) {
    const c = new Date(t.created_at).getTime();
    if (c >= first && c < last) out[Math.floor((startOfDay(new Date(c)).getTime() - first) / DAY)].value++;
  }
  return out;
}

/** Tickets created per rolling 7-day window, last `weeks` weeks (oldest -> newest). */
export function perWeek(tickets: TicketListItem[], weeks: number): DayPoint[] {
  const end = startOfDay(new Date()).getTime() + DAY;
  const out: DayPoint[] = Array.from({ length: weeks }, (_, i) => {
    const date = new Date(end - (weeks - i) * 7 * DAY);
    return { date, value: 0, label: `Week of ${date.toLocaleDateString("en", { month: "short", day: "numeric" })}` };
  });
  for (const t of tickets) {
    const idx = weeks - 1 - Math.floor((end - new Date(t.created_at).getTime()) / (7 * DAY));
    if (idx >= 0 && idx < weeks) out[idx].value++;
  }
  return out;
}

export const sum = (xs: { value: number }[]) => xs.reduce((n, x) => n + x.value, 0);

/** % change of `cur` vs `prev`; null when no baseline. */
export function delta(cur: number, prev: number): number | null {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** 7 (Mon..Sun) x 24 grid of creation counts. */
export function heatmap(tickets: TicketListItem[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const t of tickets) {
    const d = new Date(t.created_at);
    grid[(d.getDay() + 6) % 7][d.getHours()]++;
  }
  return grid;
}

export function slaMix(tickets: TicketListItem[], now: Date) {
  const mix = { on_track: 0, at_risk: 0, overdue: 0, resolved: 0 };
  for (const t of tickets) mix[computeFrontendSlaState(t.status, t.due_at, t.created_at, t.priority, now)]++;
  return mix;
}

const AGE_BUCKETS = [
  { label: "< 1h", max: 1 }, { label: "1–4h", max: 4 }, { label: "4–24h", max: 24 },
  { label: "1–3d", max: 72 }, { label: "> 3d", max: Infinity },
];

/** How long currently-open tickets have been waiting. */
export function ageBuckets(tickets: TicketListItem[], now: Date) {
  const counts = AGE_BUCKETS.map((b) => ({ label: b.label, value: 0 }));
  for (const t of tickets) {
    if (t.status === "Closed") continue;
    const h = (now.getTime() - new Date(t.created_at).getTime()) / 3_600_000;
    counts[AGE_BUCKETS.findIndex((b) => h < b.max)].value++;
  }
  return counts;
}

export function avgOpenAgeHours(tickets: TicketListItem[], now: Date): number | null {
  const open = tickets.filter((t) => t.status !== "Closed");
  if (!open.length) return null;
  return open.reduce((n, t) => n + (now.getTime() - new Date(t.created_at).getTime()), 0) / open.length / 3_600_000;
}

export function topCustomers(tickets: TicketListItem[], n = 5) {
  const m = new Map<string, { name: string; email: string; total: number; active: number }>();
  for (const t of tickets) {
    const k = t.customer_email.toLowerCase();
    const c = m.get(k) ?? { name: t.customer_name, email: t.customer_email, total: 0, active: 0 };
    c.total++;
    if (t.status !== "Closed") c.active++;
    m.set(k, c);
  }
  return [...m.values()].sort((a, b) => b.total - a.total).slice(0, n);
}

export function fmtHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
