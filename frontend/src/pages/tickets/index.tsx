import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Sparkline } from "@/components/charts";
import { avgOpenAgeHours, fmtHours, perDay } from "@/lib/analytics";

import { Layout } from "@/components/layout";
import { useTickets, useStats } from "@/hooks/useTickets";
import { useDebounce } from "@/hooks/useDebounce";
import { useNow } from "@/hooks/useNow";
import { QueueToolbar } from "@/components/ticket/queue-toolbar";
import { TicketRow } from "@/components/ticket/ticket-row";
import { formatTimeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AlertCircle, TicketIcon } from "lucide-react";

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow(60000);
  
  const statusFilter = searchParams.get("status") || "all";
  const urlSearch = searchParams.get("search") || "";
  // The box owns its own text. Reading it back from the URL on every keystroke dropped
  // characters (URL updates are async), so the URL is only synced after typing pauses.
  const [searchInput, setSearchInput] = useState(urlSearch);
  const priorityFilter = searchParams.get("priority") || "all";
  const sortFilter = searchParams.get("sort") || "priority_sla";
  const slaFilter = searchParams.get("sla") || "all";
  
  // Use limit for "Load more", starting at 15
  const limit = parseInt(searchParams.get("limit") || "15", 10);
  const offset = 0; // Always start at 0, limit expands

  const debouncedSearch = useDebounce(searchInput, 300);

  // typing -> URL (debounced, replaces history so Back isn't flooded)
  useEffect(() => {
    if (debouncedSearch === urlSearch) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch); else next.delete("search");
    next.delete("limit");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // URL -> box, only for changes that didn't come from typing (sidebar views, Clear filters, Back)
  useEffect(() => {
    if (urlSearch !== debouncedSearch && urlSearch !== searchInput) setSearchInput(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const { data: stats } = useStats();
  const { data, isLoading, isError, dataUpdatedAt } = useTickets({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    sort: sortFilter !== "priority_sla" ? sortFilter : undefined,
    sla: slaFilter !== "all" ? slaFilter : undefined,
    limit,
    offset,
  });

  const { data: everything } = useTickets({ limit: 200, sort: "newest" });
  const insight = useMemo(() => {
    const t = everything?.data ?? [];
    const days = perDay(t, 14);
    return { today: days[days.length - 1].value, spark: days.map((d) => d.value), age: avgOpenAgeHours(t, now) };
  }, [everything, now]);
  const total = data?.total || 0;
  const tickets = data?.data || [];
  const hasMore = tickets.length < total;

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "all" || (key === "sort" && val === "priority_sla")) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    next.delete("limit"); // reset limit when filters change
    setSearchParams(next);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleLoadMore = () => {
    const next = new URLSearchParams(searchParams);
    next.set("limit", (limit + 15).toString());
    setSearchParams(next);
  };

  const filtersOn = searchInput || statusFilter !== "all" || priorityFilter !== "all" || slaFilter !== "all";
  return (
    <Layout>
      <div className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Tickets</h1>
            <p className="mt-1 text-sm text-muted-foreground">{total} {filtersOn ? "matching" : "total"} · updated {dataUpdatedAt ? formatTimeAgo(new Date(dataUpdatedAt).toISOString()) : "just now"}</p>
          </div>
          {filtersOn && <button onClick={() => { setSearchInput(""); setSearchParams(new URLSearchParams()); }} className="text-xs font-medium text-primary hover:underline">Clear filters</button>}
        </div>

        {slaFilter !== "all" && (
          <div className="flex items-center justify-between rounded-xl border border-[var(--td-sla-overdue)]/30 bg-[var(--td-sla-overdue)]/10 px-4 py-2.5 text-[13px]">
            <span className="flex items-center gap-2 font-medium text-[var(--td-sla-overdue)]"><AlertCircle className="size-4" />Showing {({ overdue: "past-due", at_risk: "at-risk", on_track: "on-track" } as Record<string, string>)[slaFilter] ?? slaFilter} tickets only</span>
            <button onClick={() => updateParams({ sla: null })} className="font-semibold hover:underline">Show all</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { l: "Created today", v: insight.today, c: "var(--primary)", s: insight.spark },
            { l: "Avg. open age", v: fmtHours(insight.age), c: "var(--td-sla-at-risk)" },
            { l: "Past due", v: stats?.overdue ?? "—", c: "var(--td-sla-overdue)" },
            { l: "SLA met", v: stats?.sla_met_pct !== undefined ? `${Math.round(stats.sla_met_pct)}%` : "—", c: "var(--td-status-closed)" },
          ].map((s) => (
            <div key={s.l} className="card-surface lift flex items-center justify-between gap-3 px-4 py-3">
              <div><p className="eyebrow">{s.l}</p><p className="stat mt-1.5 text-2xl leading-none" style={{ color: s.c }}>{s.v}</p></div>
              {s.s && <div className="w-20"><Sparkline data={s.s} color={s.c} height={32} /></div>}
            </div>
          ))}
        </div>

        <QueueToolbar
          searchInput={searchInput}
          onSearchChange={handleSearch}
          statusFilter={statusFilter}
          onStatusChange={(v) => updateParams({ status: v })}
          priorityFilter={priorityFilter}
          onPriorityChange={(v) => updateParams({ priority: v })}
          slaFilter={slaFilter}
          onSlaChange={(v) => updateParams({ sla: v })}
          sortFilter={sortFilter}
          onSortChange={(v) => updateParams({ sort: v })}
          stats={stats}
        />

        <div className="card-surface overflow-hidden">
          <div className="hidden grid-cols-[24px_minmax(0,1fr)_150px_110px_130px] gap-x-3 border-b border-border bg-white/[0.02] px-5 py-2.5 md:grid">
            <span /><span className="eyebrow">Ticket</span><span className="eyebrow">Customer</span><span className="eyebrow">Priority</span><span className="eyebrow text-right">Status / SLA</span>
          </div>
          {isLoading && !tickets.length ? (
            <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center"><AlertCircle className="size-8 text-[var(--td-urgent)]" /><p className="font-semibold">Couldn't load tickets</p><p className="text-sm text-muted-foreground">There was a problem reaching the server.</p></div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center"><TicketIcon className="size-8 text-muted-foreground/50" /><p className="font-semibold">No tickets found</p><p className="max-w-sm text-sm text-muted-foreground">Nothing matches the current filters.</p>{filtersOn && <Button variant="outline" className="mt-2" onClick={() => { setSearchInput(""); setSearchParams(new URLSearchParams()); }}>Clear filters</Button>}</div>
          ) : (
            <div className="divide-y divide-border">{tickets.map((t, idx) => <TicketRow key={t.ticket_id} ticket={t} now={now} index={idx} />)}</div>
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" disabled={isLoading} onClick={handleLoadMore} className="h-9 min-w-[220px]">Load more ({total - tickets.length} remaining)</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
