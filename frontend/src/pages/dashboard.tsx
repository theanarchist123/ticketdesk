import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, Flame, Plus, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout";
import { useAnalytics, useStats, useTickets } from "@/hooks/useTickets";
import { useNow } from "@/hooks/useNow";
import { formatTimeAgo, formatTimeLeft } from "@/lib/format";
import { SlaRing } from "@/components/ui/sla-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityMark } from "@/components/ui/priority-mark";
import { Avatar } from "@/components/ui/avatar";
import { AnalyticsError, AreaChart, ChartCard, Delta, Donut } from "@/components/charts";
import { delta, sum, weekPoints } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const PRIORITIES = [
  { key: "Urgent", color: "var(--td-urgent)" },
  { key: "High", color: "var(--td-high)" },
  { key: "Medium", color: "var(--td-status-open)" },
  { key: "Low", color: "oklch(0.62 0.03 265)" },
];

/** KPI tile: big number + a meter showing its share of a whole. */
function Kpi({ label, value, hint, to, color, pct }: { label: string; value: string | number; hint: string; to: string; color: string; pct: number }) {
  return (
    <Link to={to} className="card-surface lift group relative flex flex-col overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <p className="stat mt-3 text-[42px] leading-none" style={{ color }}>{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-auto pt-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} /></div>
      </div>
    </Link>
  );
}

/** Radial gauge used in the hero. */
function Gauge({ pct, color }: { pct: number; color: string }) {
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="relative grid size-[150px] place-items-center">
      <svg width="150" height="150" viewBox="0 0 130 130" className="-rotate-90 overflow-visible">
        <circle cx="65" cy="65" r={R} fill="none" stroke="var(--muted)" strokeWidth="9" />
        <circle cx="65" cy="65" r={R} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      </svg>
      <div className="absolute text-center"><p className="stat text-4xl leading-none">{Math.round(pct)}<span className="text-lg text-muted-foreground">%</span></p><p className="eyebrow mt-1.5">SLA met</p></div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useStats();
  const { data: queue, isLoading: qLoading } = useTickets({ limit: 8, status: "Open,In Progress" });
  const { data: recentData } = useTickets({ limit: 5, sort: "newest" });
  const { data: analytics, isError: analyticsFailed } = useAnalytics();
  const now = useNow();

  const active = (stats?.open ?? 0) + (stats?.in_progress ?? 0);
  const overdue = stats?.overdue ?? 0;
  const atRisk = stats?.at_risk ?? 0;
  const met = stats?.sla_met_pct ?? 0;
  const byPri = stats?.by_priority ?? {};
  const priTotal = PRIORITIES.reduce((n, p) => n + (byPri[p.key] ?? 0), 0);
  const dash = (v: number | string | undefined) => (isLoading || v === undefined ? "—" : v);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const an = useMemo(() => {
    const weeks = weekPoints(analytics);
    const last4 = sum(weeks.slice(-4)), prev4 = sum(weeks.slice(-8, -4));
    const sla = analytics?.sla_mix ?? { on_track: 0, at_risk: 0, overdue: 0, resolved: 0 };
    return { weeks, last4, d: delta(last4, weeks.length >= 8 ? prev4 : null), sla, n: sla.on_track + sla.at_risk + sla.overdue + sla.resolved, recent: recentData?.data ?? [] };
  }, [analytics, recentData]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Hero */}
        <section className="card-surface relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[oklch(0.6_0.15_265)]/10 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now)}</p>
              <h1 className="mt-2 text-4xl font-bold sm:text-[44px] sm:leading-[1.1]">{greeting}.</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {isLoading ? "Loading your queue…" : overdue ? <><span className="font-semibold text-[var(--td-urgent)]">{overdue} tickets</span> are past their response target. Clear those first, then {active - overdue > 0 ? `${active - overdue} more are waiting.` : "you're caught up."}</> : active ? `${active} active tickets, all within their response targets.` : "Nothing waiting. Enjoy the quiet."}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link to={overdue ? "/tickets?sla=overdue" : "/tickets"} className={cn("inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-all hover:-translate-y-0.5 active:scale-95", overdue ? "bg-[var(--td-urgent)] text-black shadow-[0_8px_24px_-8px_var(--td-urgent)]" : "glow-primary bg-primary text-primary-foreground")}>
                  {overdue ? <Flame className="size-4" /> : <ArrowRight className="size-4" />}{overdue ? "Handle past-due tickets" : "Open queue"}
                </Link>
                <Link to="/tickets/new" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background/40 px-4 text-[13px] font-medium transition-all hover:-translate-y-0.5 hover:bg-white/5 active:scale-95"><Plus className="size-4" />New ticket</Link>
                <Link to="/board" className="inline-flex h-10 items-center rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Open board →</Link>
              </div>
            </div>

            <div className="flex w-full items-center gap-6 rounded-2xl border border-border bg-background/50 p-5 backdrop-blur md:w-auto">
              <Gauge pct={met} color="var(--primary)" />
              <dl className="space-y-3 text-[13px]">
                {[["Resolved", stats?.closed ?? 0, "var(--td-status-closed)"], ["In progress", stats?.in_progress ?? 0, "var(--td-status-in-progress)"], ["Waiting", stats?.open ?? 0, "var(--td-status-open)"]].map(([l, v, c]) => (
                  <div key={l as string} className="flex items-center gap-2.5"><span className="size-2 rounded-full" style={{ background: c as string }} /><dt className="text-muted-foreground">{l}</dt><dd className="stat ml-auto pl-4 text-base">{v}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {analyticsFailed && <AnalyticsError />}

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="Active" value={dash(active)} hint={`${stats?.in_progress ?? 0} in progress · ${stats?.open ?? 0} waiting`} to="/tickets" color="var(--td-status-open)" pct={stats?.all ? (active / stats.all) * 100 : 0} />
          <Kpi label="Past due" value={dash(overdue)} hint="Missed response target" to="/tickets?sla=overdue" color="var(--td-sla-overdue)" pct={active ? (overdue / active) * 100 : 0} />
          <Kpi label="At risk" value={dash(atRisk)} hint="Under 25% of window left" to="/tickets?sla=at_risk" color="var(--td-sla-at-risk)" pct={active ? (atRisk / active) * 100 : 0} />
          <Kpi label="Resolved" value={dash(stats?.closed)} hint={`${stats?.all ?? 0} tickets all time`} to="/tickets?status=Closed" color="var(--td-status-closed)" pct={stats?.all ? (stats.closed / stats.all) * 100 : 0} />
        </section>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ChartCard
            title="Ticket volume"
            subtitle="New tickets per week, last 12 weeks"
            right={<div className="text-right"><p className="stat text-2xl leading-none">{an.last4}</p><div className="mt-1.5"><Delta value={an.d} goodWhen="down" suffix="last 4 wks" /></div></div>}
          >
            <AreaChart data={an.weeks} height={220} />
          </ChartCard>
          <ChartCard title="SLA health" subtitle="Where every ticket stands">
            <Donut center={an.n} caption="tickets" segments={[
              { label: "On track", value: an.sla.on_track, color: "var(--td-sla-on-track)" },
              { label: "At risk", value: an.sla.at_risk, color: "var(--td-sla-at-risk)" },
              { label: "Past due", value: an.sla.overdue, color: "var(--td-sla-overdue)" },
              { label: "Resolved", value: an.sla.resolved, color: "var(--td-sla-resolved)" },
            ]} />
          </ChartCard>
        </div>

        {/* Queue + side */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="card-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div><h2 className="text-sm font-semibold">Up next</h2><p className="text-xs text-muted-foreground">Closest response deadline first</p></div>
              <Link to="/tickets" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight className="size-3" /></Link>
            </div>
            {qLoading ? (
              <div className="space-y-2 p-4">{[0, 1, 2].map((x) => <div key={x} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : !queue?.data.length ? (
              <div className="px-6 py-14 text-center"><Sparkles className="mx-auto mb-3 size-5 text-primary" /><p className="text-sm font-medium">Queue is clear</p><p className="mt-1 text-xs text-muted-foreground">New requests will show up here.</p></div>
            ) : (
              <div className="divide-y divide-border">
                {queue.data.map((t, i) => (
                  <Link key={t.ticket_id} to={`/tickets/${t.ticket_id}`} style={{ animationDelay: `${i * 40}ms` }} className="row-in group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.04]">
                    <SlaRing dueAt={t.due_at} createdAt={t.created_at} status={t.status} priority={t.priority} size="sm" />
                    <Avatar name={t.customer_name} email={t.customer_email} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium group-hover:text-primary">{t.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground"><span className="font-mono">{t.ticket_id}</span> · {t.customer_name}</p>
                    </div>
                    <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">{formatTimeLeft(t.due_at, now, t.status)}</span>
                    <div className="hidden items-center gap-2.5 sm:flex"><PriorityMark priority={t.priority} /><StatusBadge status={t.status} /></div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-6">
            <aside className="card-surface p-5">
              <h2 className="text-sm font-semibold">Open by priority</h2>
              <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                {PRIORITIES.map((p) => <div key={p.key} className="rounded-full transition-all duration-700" style={{ width: `${priTotal ? ((byPri[p.key] ?? 0) / priTotal) * 100 : 0}%`, background: p.color }} />)}
              </div>
              <ul className="mt-4 space-y-1">
                {PRIORITIES.map((p) => (
                  <li key={p.key}>
                    <Link to={`/tickets?priority=${p.key}`} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-white/5">
                      <span className="size-2 rounded-full" style={{ background: p.color }} />{p.key}<span className="stat ml-auto text-sm">{byPri[p.key] ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>

            <aside className="card-surface p-5">
              <h2 className="text-sm font-semibold">Recently created</h2>
              <ul className="mt-4 space-y-3.5">
                {an.recent.map((t) => (
                  <li key={t.ticket_id}>
                    <Link to={`/tickets/${t.ticket_id}`} className="group flex items-start gap-3">
                      <Avatar name={t.customer_name} email={t.customer_email} size="sm" className="mt-0.5" />
                      <div className="min-w-0"><p className="truncate text-[13px] font-medium group-hover:text-primary">{t.subject}</p><p className="text-[11px] text-muted-foreground">{t.customer_name} · {formatTimeAgo(t.created_at)}</p></div>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  );
}
