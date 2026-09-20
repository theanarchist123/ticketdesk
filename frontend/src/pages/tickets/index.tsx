import { Link, useSearchParams } from "react-router";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { Layout } from "@/components/layout";
import { useTickets } from "@/hooks/useTickets";
import { useDebounce } from "@/hooks/useDebounce";
import { useNow } from "@/hooks/useNow";
import { SLARing } from "@/components/ui/sla-ring";
import { computeFrontendSlaState } from "@/lib/sla";
import { formatTimeLeft } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow(60000); // update every minute
  
  const statusFilter = searchParams.get("status") || "all";
  const searchInput = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 15;
  const offset = (page - 1) * limit;

  const debouncedSearch = useDebounce(searchInput, 500);

  const { data, isLoading, isError } = useTickets({
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
            <h1 className="text-3xl font-bold tracking-tight">Support Queue</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live monitoring active. {total} tickets found.
            </p>
          </div>
          <Button asChild>
            <Link to="/tickets/new">Create Ticket</Link>
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-2 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by ID, name, email..."
                className="pl-9 w-full bg-background/50 border-none"
                value={searchInput}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px] border-none bg-background/50">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ticket List */}
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading tickets...
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-rose-500 flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              Failed to load tickets. Please try again.
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No tickets found matching your criteria.
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence mode="popLayout">
                {tickets.map((t, idx) => {
                  const currentState = computeFrontendSlaState(
                    t.status,
                    t.due_at,
                    t.created_at,
                    t.priority,
                    now
                  );
                  
                  return (
                    <motion.div
                      key={t.ticket_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link 
                        to={`/tickets/${t.ticket_id}`}
                        className="flex flex-col sm:flex-row items-start sm:items-center p-4 hover:bg-muted/50 transition-colors gap-4 group"
                      >
                        <div className="flex-shrink-0 w-12 flex justify-center">
                          <SLARing state={currentState} size="md" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">
                              {t.ticket_id}
                            </span>
                            <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                              {t.subject}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground truncate">
                            <span className="font-medium text-foreground/80">{t.customer_name}</span>
                            <span>•</span>
                            <span>Created {format(new Date(t.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <Badge variant={t.priority === "Urgent" ? "destructive" : "secondary"}>
                              {t.priority}
                            </Badge>
                            <Badge variant="outline" className={
                              t.status === "Open" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" :
                              t.status === "In Progress" ? "text-amber-500 border-amber-500/20 bg-amber-500/10" : ""
                            }>
                              {t.status}
                            </Badge>
                          </div>
                          {t.status !== "Closed" && (
                            <span className={`text-xs font-medium ${
                              currentState === 'overdue' ? 'text-rose-500' :
                              currentState === 'at_risk' ? 'text-amber-500' : 'text-emerald-500'
                            }`}>
                              {currentState === 'overdue' ? 'Overdue by ' : 'Due in '}
                              {formatTimeLeft(t.due_at, now)}
                            </span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} tickets
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
