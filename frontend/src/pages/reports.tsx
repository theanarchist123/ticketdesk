import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Layout } from "@/components/layout";
import { useStats, useTickets } from "@/hooks/useTickets";
import { useNow } from "@/hooks/useNow";
import { AreaChart, BarChart, ChartCard, Donut, HBars, Heatmap, StatTile } from "@/components/charts";
import { ageBuckets, avgOpenAgeHours, delta, fmtHours, heatmap, perDay, slaMix, sum, topCustomers, WEEKDAYS } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const RANGES = [7, 14, 30, 90] as const;
const PRIORITIES = [
  { key: "Urgent", color: "var(--td-urgent)" },
  { key: "High", color: "var(--td-high)" },
  { key: "Medium", color: "var(--td-status-open)" },
  { key: "Low", color: "oklch(0.62 0.03 265)" },
];

export default function ReportsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const { data: stats } = useStats();
  const { data } = useTickets({ limit: 200, sort: "newest" });
  const now = useNow(60000);
  const tickets = data?.data ?? [];

  const a = useMemo(() => {
    const cur = perDay(tickets, range);
    const prev = perDay(tickets, range, range);
    return {
      cur, prevTotal: sum(prev), total: sum(cur),
      sla: slaMix(tickets, now), age: ageBuckets(tickets, now), avgAge: avgOpenAgeHours(tickets, now),
      heat: heatmap(tickets), top: topCustomers(tickets, 5),
    };
  }, [tickets, range, now]);

  const byPri = stats?.by_priority ?? {};
  const met = stats?.sla_met_pct;
  const active = stats ? stats.open + stats.in_progress : undefined;
  const peak = a.cur.reduce((m, d) => (d.value > m.value ? d : m), a.cur[0]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-2xl font-semibold">Reports</h1><p className="mt-1 text-sm text-muted-foreground">Volume, workload and response-time health.</p></div>
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1 shadow-[inset_0_2px_6px_oklch(0_0_0/0.3)]" role="tablist">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} role="tab" aria-selected={range === r} className={cn("relative rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all active:scale-95", range === r ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {range === r && <motion.span layoutId="range-pill" transition={{ type: "spring", stiffness: 450, damping: 32 }} className="absolute inset-0 rounded-lg bg-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_6px_18px_-6px_color-mix(in_oklch,var(--primary)_70%,transparent)]" />}
                <span className="relative z-10">{r} days</span>
              </button>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile className="lift" label={`Created · ${range}d`} value={a.total} color="var(--primary)" spark={a.cur.map((d) => d.value)} delta={delta(a.total, a.prevTotal)} goodWhen="down" />
          <StatTile className="lift" label="Active now" value={active ?? "—"} color="var(--td-status-open)" hint={`${stats?.in_progress ?? 0} in progress · ${stats?.open ?? 0} open`} />
          <StatTile className="lift" label="Avg. open age" value={fmtHours(a.avgAge)} color="var(--td-sla-at-risk)" hint="How long active tickets have waited" />
          <StatTile className="lift" label="SLA met" value={met !== undefined ? `${Math.round(met)}%` : "—"} color="var(--td-status-closed)" hint={`${stats?.closed ?? 0} resolved tickets`} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <ChartCard title="Ticket volume" subtitle={`New tickets per day · busiest: ${peak?.value ? `${peak.label} (${peak.value})` : "—"}`}>
            <AreaChart data={a.cur} height={230} />
          </ChartCard>
          <ChartCard title="SLA health" subtitle="All tickets, right now">
            <Donut center={tickets.length} caption="tickets" segments={[
              { label: "On track", value: a.sla.on_track, color: "var(--td-sla-on-track)" },
              { label: "At risk", value: a.sla.at_risk, color: "var(--td-sla-at-risk)" },
              { label: "Past due", value: a.sla.overdue, color: "var(--td-sla-overdue)" },
              { label: "Resolved", value: a.sla.resolved, color: "var(--td-sla-resolved)" },
            ]} />
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
          <ChartCard title="Backlog age" subtitle="How long active tickets have waited">
            <BarChart data={a.age} color="var(--td-sla-at-risk)" height={150} />
          </ChartCard>
        </div>

        <ChartCard title="When tickets arrive" subtitle="Creation time by weekday and hour — use it to plan staffing">
          <Heatmap grid={a.heat} rows={WEEKDAYS} />
        </ChartCard>

        <ChartCard title="Top customers by volume" subtitle="Most requests in recent history">
          {a.top.length ? <HBars data={a.top.map((c) => ({ label: c.name, sub: `${c.active} active`, value: c.total }))} /> : <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>}
        </ChartCard>
      </div>
    </Layout>
  );
}
