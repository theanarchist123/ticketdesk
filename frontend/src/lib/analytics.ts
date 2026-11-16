import type { Analytics } from "./types";

/* Chart helpers. All numbers come from the server (/api/analytics, computed over every ticket);
 * these functions only reshape them for the chart components. */

export interface DayPoint { label: string; value: number; date: Date }

// "YYYY-MM-DD" -> a Date at local midnight (avoids the UTC-parsing off-by-one)
const parseDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDay = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });

type DayRow = { date: string; count: number };

/** Last `n` days of a per-day series (the server sends 90, oldest first). */
export function lastDays(rows: DayRow[] | undefined, n: number): DayPoint[] {
  return (rows ?? []).slice(-n).map((r) => { const date = parseDay(r.date); return { date, value: r.count, label: fmtDay(date) }; });
}

/** Total of the n days before the last n, or null if the history is too short to compare. */
export function previousTotal(rows: DayRow[] | undefined, n: number): number | null {
  if (!rows || rows.length < n * 2) return null;
  return rows.slice(-n * 2, -n).reduce((s, r) => s + r.count, 0);
}

export function weekPoints(a: Analytics | undefined): DayPoint[] {
  return (a?.created_per_week ?? []).map((w) => { const date = parseDay(w.start); return { date, value: w.count, label: `Week of ${fmtDay(date)}` }; });
}

export const sum = (xs: { value: number }[]) => xs.reduce((n, x) => n + x.value, 0);

/** % change of `cur` vs `prev`; null when there is no baseline to compare to. */
export function delta(cur: number, prev: number | null): number | null {
  if (prev === null) return null;
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function fmtHours(h: number | null | undefined): string {
  if (h === null || h === undefined) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
