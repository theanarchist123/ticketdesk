import { Link, useSearchParams } from "react-router";

import { AnimatePresence } from "motion/react";
import { Layout } from "@/components/layout";
import { useTickets, useStats } from "@/hooks/useTickets";
import { useDebounce } from "@/hooks/useDebounce";
import { useNow } from "@/hooks/useNow";
import { QueueToolbar } from "@/components/ticket/queue-toolbar";
import { TicketRow } from "@/components/ticket/ticket-row";
import { formatTimeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle, TicketIcon } from "lucide-react";

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow(60000);
  
  const statusFilter = searchParams.get("status") || "all";
  const searchInput = searchParams.get("search") || "";
  const priorityFilter = searchParams.get("priority") || "all";
  const sortFilter = searchParams.get("sort") || "priority_sla";
  const slaFilter = searchParams.get("sla") || "all";
  
  // Use limit for "Load more", starting at 15
  const limit = parseInt(searchParams.get("limit") || "15", 10);
  const offset = 0; // Always start at 0, limit expands

  const debouncedSearch = useDebounce(searchInput, 300);

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
    updateParams({ search: e.target.value || null });
  };

  const handleLoadMore = () => {
    const next = new URLSearchParams(searchParams);
    next.set("limit", (limit + 15).toString());
    setSearchParams(next);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support queue</h1>
            <p className="text-[var(--td-muted)] mt-1 flex items-center gap-2">
              {total} tickets &middot; Updated {dataUpdatedAt ? formatTimeAgo(new Date(dataUpdatedAt).toISOString()) : "just now"}
            </p>
          </div>
          <Button asChild className="bg-[var(--td-primary)] text-white hover:opacity-90">
            <Link to="/tickets/new">New ticket</Link>
          </Button>
        </div>

        {stats?.overdue ? (
          <div className="bg-[var(--td-sla-overdue)]/10 text-[var(--td-sla-overdue)] text-sm px-4 py-3 rounded-lg flex items-center justify-between border border-[var(--td-sla-overdue)]/20">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>{stats.overdue} ticket{stats.overdue > 1 ? 's are' : ' is'} past their response time</span>
            </div>
            <button 
              onClick={() => updateParams({ sla: "overdue", status: "all" })}
              className="font-semibold hover:underline"
            >
              Show them
            </button>
          </div>
        ) : null}

        <QueueToolbar
          searchInput={searchInput}
          onSearchChange={handleSearch}
          statusFilter={statusFilter}
          onStatusChange={(v) => updateParams({ status: v })}
          priorityFilter={priorityFilter}
          onPriorityChange={(v) => updateParams({ priority: v })}
          sortFilter={sortFilter}
          onSortChange={(v) => updateParams({ sort: v })}
          stats={stats}
        />

        {/* Ticket List */}
        <div className="bg-[var(--td-surface)] border border-[var(--td-border)] rounded-xl overflow-hidden shadow-sm min-h-[400px] relative">
          {isLoading && !tickets.length ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--td-muted)] gap-4 bg-[var(--td-surface)]/50 backdrop-blur-sm z-10">
              <div className="h-8 w-8 border-2 border-[var(--td-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="font-medium animate-pulse">Loading queue...</p>
            </div>
          ) : isError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--td-sla-overdue)] gap-4 p-8 text-center bg-[var(--td-surface)] z-10">
              <AlertCircle className="h-10 w-10 opacity-80" />
              <div>
                <h3 className="font-bold text-lg">Failed to load tickets</h3>
                <p className="opacity-80 mt-1">There was a problem communicating with the server.</p>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--td-muted)] gap-4 p-8 text-center bg-[var(--td-surface)] z-10">
              <TicketIcon className="h-12 w-12 opacity-20" />
              <div>
                <h3 className="font-semibold text-lg text-[var(--td-text)]">No tickets found</h3>
                <p className="mt-1 max-w-sm mx-auto">We couldn't find any tickets matching your current filters. Try adjusting your search or clearing the status filter.</p>
              </div>
              {(searchInput || statusFilter !== "all" || priorityFilter !== "all" || slaFilter !== "all") && (
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => setSearchParams(new URLSearchParams())}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : null}

          <div className="divide-y divide-[var(--td-border)]">
            <AnimatePresence mode="popLayout">
              {tickets.map((t, idx) => (
                <TicketRow key={t.ticket_id} ticket={t} now={now} index={idx} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Pagination -> Load more */}
        {hasMore && (
          <div className="flex justify-center mt-2">
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={handleLoadMore}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {isLoading ? "Loading..." : `Load more (${total - tickets.length} remaining)`}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
