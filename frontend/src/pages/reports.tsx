import { useState } from "react";
import { motion } from "motion/react";
import { Layout } from "@/components/layout";
import { useAnalytics, useStats } from "@/hooks/useTickets";
import { AnalyticsError, AreaChart, BarChart, ChartCard, Donut, HBars, Heatmap, StatTile } from "@/components/charts";
import { delta, fmtHours, lastDays, previousTotal, sum, WEEKDAYS } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const RANGES = [7, 14, 30, 90] as const;
const PRIORITIES = [
  { key: "Urgent", color: "var(--td-urgent)" },
  { key: "High", color: "var(--td-high)" },
  { key: "Medium", color: "var(--td-status-open)" },
  { key: "Low", color: "oklch(0.62 0.03 265)" },
];

export default function ReportsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const { data: stats } = useStats();
  const { data: a, isError: analyticsFailed } = useAnalytics();

  const created = lastDays(a?.created_per_day, range);
  const resolved = lastDays(a?.resolved_per_day, range);
  const createdTotal = sum(created);
  const resolvedTotal = sum(resolved);
  const createdDelta = delta(createdTotal, previousTotal(a?.created_per_day, range));
  const peak = created.reduce((m, d) => (d.value > m.value ? d : m), created[0] ?? { value: 0, label: "—" });
  const byPri = stats?.by_priority ?? {};
  const sla = a?.sla_mix ?? { on_track: 0, at_risk: 0, overdue: 0, resolved: 0 };
  const totalTickets = sla.on_track + sla.at_risk + sla.overdue + sla.resolved;
  const met = stats?.sla_met_pct;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-2xl font-semibold">Reports</h1><p className="mt-1 text-sm text-muted-foreground">Live numbers from every ticket in the system. Times use your local timezone.</p></div>
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1 shadow-[inset_0_2px_6px_oklch(0_0_0/0.3)]" role="tablist">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} role="tab" aria-selected={range === r} className={cn("relative rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all active:scale-95", range === r ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {range === r && <motion.span layoutId="range-pill" transition={{ type: "spring", stiffness: 450, damping: 32 }} className="absolute inset-0 rounded-lg bg-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_6px_18px_-6px_color-mix(in_oklch,var(--primary)_70%,transparent)]" />}
                <span className="relative z-10">{r} days</span>
              </button>
            ))}
          </div>
        </div>

        {analyticsFailed && <AnalyticsError />}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile className="lift" label={`Created · ${range}d`} value={createdTotal} color="var(--primary)" spark={created.map((d) => d.value)} delta={createdDelta} goodWhen="down" hint={createdDelta === null ? "No earlier period to compare" : undefined} />
          <StatTile className="lift" label={`Resolved · ${range}d`} value={resolvedTotal} color="var(--td-status-closed)" spark={resolved.map((d) => d.value)} hint={`${stats?.closed ?? 0} resolved all time`} />
          <StatTile className="lift" label="Avg. resolution time" value={fmtHours(a?.avg_resolution_hours)} color="var(--td-status-open)" hint="Created → resolved, closed tickets" />
          <StatTile className="lift" label="SLA met" value={met !== undefined ? `${Math.round(met)}%` : "—"} color="var(--td-sla-on-track)" hint={`Avg. open age ${fmtHours(a?.avg_open_age_hours)}`} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <ChartCard title="Tickets created" subtitle={`Per day · busiest: ${peak?.value ? `${peak.label} (${peak.value})` : "none in this period"}`}>
            <AreaChart data={created} height={230} />
          </ChartCard>
          <ChartCard title="SLA health" subtitle="All tickets, right now">
            <Donut center={totalTickets} caption="tickets" segments={[
              { label: "On track", value: sla.on_track, color: "var(--td-sla-on-track)" },
              { label: "At risk", value: sla.at_risk, color: "var(--td-sla-at-risk)" },
              { label: "Past due", value: sla.overdue, color: "var(--td-sla-overdue)" },
              { label: "Resolved", value: sla.resolved, color: "var(--td-sla-resolved)" },
            ]} />
          </ChartCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <ChartCard title="Tickets resolved" subtitle="Per day, by the day they were closed">
            <AreaChart data={resolved} height={200} color="var(--td-status-closed)" unit="resolved" />
          </ChartCard>
          <ChartCard title="Backlog age" subtitle="How long active tickets have waited">
            <BarChart data={(a?.age_buckets ?? []).map((b) => ({ label: b.label, value: b.count }))} color="var(--td-sla-at-risk)" height={180} />
          </ChartCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ChartCard title="By status">
            <Donut center={stats?.all ?? 0} segments={[
              { label: "Open", value: stats?.open ?? 0, color: "var(--td-status-open)" },
              { label: "In progress", value: stats?.in_progress ?? 0, color: "var(--td-status-in-progress)" },
              { label: "Closed", value: stats?.closed ?? 0, color: "var(--td-status-closed)" },
            ]} />
          </ChartCard>
          <ChartCard title="Open by priority" subtitle="Active tickets only">
            <HBars data={PRIORITIES.map((p) => ({ label: p.key, value: byPri[p.key] ?? 0, color: p.color }))} />
          </ChartCard>
          <ChartCard title="Top customers" subtitle="By total tickets, all time">
            {a?.top_customers.length ? <HBars data={a.top_customers.map((c) => ({ label: c.name, sub: `${c.active} active`, value: c.total }))} /> : <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>}
          </ChartCard>
        </div>

        <ChartCard title="When tickets arrive" subtitle="All tickets by weekday and hour of creation (your local time) — use it to plan staffing">
          <Heatmap grid={a?.heatmap ?? Array.from({ length: 7 }, () => Array(24).fill(0))} rows={WEEKDAYS} />
        </ChartCard>
      </div>
    </Layout>
  );
}
