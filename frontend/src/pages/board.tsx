import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { useTickets, useUpdateTicket } from "@/hooks/useTickets";
import { useNow } from "@/hooks/useNow";
import { formatTimeLeft } from "@/lib/format";
import { computeFrontendSlaState } from "@/lib/sla";
import { Avatar } from "@/components/ui/avatar";
import { PriorityMark } from "@/components/ui/priority-mark";
import { cn } from "@/lib/utils";
import type { TicketListItem } from "@/lib/types";

const COLUMNS = [
  { id: "Open", label: "Open", color: "var(--td-status-open)" },
  { id: "In Progress", label: "In progress", color: "var(--td-status-in-progress)" },
  { id: "Closed", label: "Closed", color: "var(--td-status-closed)" },
] as const;

const slaText: Record<string, string> = {
  overdue: "text-[var(--td-sla-overdue)]",
  at_risk: "text-[var(--td-sla-at-risk)]",
  on_track: "text-muted-foreground",
  resolved: "text-[var(--td-status-closed)]",
};

export default function BoardPage() {
  const { data, isLoading } = useTickets({ limit: 200, sort: "priority_sla" });
  const update = useUpdateTicket();
  const now = useNow(30000);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const tickets = data?.data ?? [];

  const move = (id: string, status: string) => {
    const t = tickets.find((x) => x.ticket_id === id);
    if (!t || t.status === status) return;
    update.mutate({ id, payload: { status } }, { onSuccess: () => toast.success(`${id} moved to ${status}`), onError: () => toast.error("Couldn't move ticket") });
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Drag a card to change its status. Sorted by urgency within each column.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = tickets.filter((t: TicketListItem) => t.status === col.id).slice(0, col.id === "Closed" ? 12 : 50);
          return (
            <section
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={() => { if (dragId) move(dragId, col.id); setDragId(null); setOverCol(null); }}
              className={cn("rounded-2xl border bg-card/40 p-3 transition-colors", overCol === col.id ? "border-primary/60 bg-primary/5" : "border-border")}
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="size-2 rounded-full" style={{ background: col.color }} />
                <h2 className="text-[13px] font-semibold">{col.label}</h2>
                <span className="ml-auto rounded-md bg-white/5 px-1.5 text-xs tabular-nums text-muted-foreground">{tickets.filter((t) => t.status === col.id).length}</span>
              </div>
              <div className="flex min-h-24 flex-col gap-2.5">
                {isLoading && [0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
                {items.map((t) => {
                  const state = computeFrontendSlaState(t.status, t.due_at, t.created_at, t.priority, now);
                  return (
                    <Link
                      key={t.ticket_id}
                      to={`/tickets/${t.ticket_id}`}
                      draggable
                      onDragStart={() => setDragId(t.ticket_id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      className={cn("card-surface lift block cursor-grab p-3.5 active:cursor-grabbing", dragId === t.ticket_id && "opacity-40")}
                    >
                      <div className="flex items-center justify-between"><span className="font-mono text-[11px] text-muted-foreground">{t.ticket_id}</span><PriorityMark priority={t.priority} size={14} /></div>
                      <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug">{t.subject}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <Avatar name={t.customer_name} email={t.customer_email} size="sm" />
                        <span className="truncate text-muted-foreground">{t.customer_name}</span>
                        <span className={cn("ml-auto whitespace-nowrap font-medium tabular-nums", slaText[state])}>{formatTimeLeft(t.due_at, now, t.status)}</span>
                      </div>
                    </Link>
                  );
                })}
                {!isLoading && !items.length && <p className="py-6 text-center text-xs text-muted-foreground">Nothing here</p>}
              </div>
            </section>
          );
        })}
      </div>
    </Layout>
  );
}
