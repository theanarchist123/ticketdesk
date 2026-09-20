import { Link, useSearchParams } from "react-router";

import { AnimatePresence } from "motion/react";
import { Layout } from "@/components/layout";
import { useTickets } from "@/hooks/useTickets";
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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 15;
  const offset = (page - 1) * limit;

  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading, isError, dataUpdatedAt } = useTickets({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    limit,
    offset,
  });

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const tickets = data?.data || [];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) {
      next.set("search", e.target.value);
    } else {
      next.delete("search");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleStatusChange = (val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val !== "all") {
      next.set("status", val);
    } else {
      next.delete("status");
    }
    next.set("page", "1");
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

        <QueueToolbar
          searchInput={searchInput}
          onSearchChange={handleSearch}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
        />

        {/* Ticket List */}
        <div className="bg-[var(--td-surface)] border border-[var(--td-border)] rounded-xl overflow-hidden shadow-sm min-h-[400px] relative">
          {isLoading ? (
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
              {(searchInput || statusFilter !== "all") && (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-[var(--td-muted)] font-medium">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", (page - 1).toString());
                  setSearchParams(next);
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", (page + 1).toString());
                  setSearchParams(next);
                }}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
