import { Link } from "react-router";
import { Layout } from "@/components/layout";
import { useStats, useTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlaRing } from "@/components/ui/sla-ring";
import { useEffect } from "react";

import { useNow } from "@/hooks/useNow";
import { formatTimeLeft } from "@/lib/format";
import { motion, useSpring, useTransform, useMotionValue } from "motion/react";

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1000 });
  const displayValue = useTransform(springValue, (current) => Math.round(current));
  
  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{displayValue}</motion.span>;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentTickets, isLoading: ticketsLoading } = useTickets({
    limit: 6,
    status: "Open,In Progress", 
  });
  const now = useNow();

  const byPriority = stats?.by_priority || {};
  const openTotal = (stats?.open ?? 0) + (stats?.in_progress ?? 0);
  const urgentPct = openTotal ? ((byPriority.Urgent || 0) / openTotal) * 100 : 0;
  const highPct = openTotal ? ((byPriority.High || 0) / openTotal) * 100 : 0;
  const medLowPct = openTotal ? (((byPriority.Medium || 0) + (byPriority.Low || 0)) / openTotal) * 100 : 0;

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your support queue today.</p>
        </div>

        {/* Stats Strip */}
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
            <Link to="/tickets" className="flex-1 p-6 hover:bg-muted/50 transition-colors group">
              <div className="text-sm font-medium text-muted-foreground mb-2 group-hover:text-foreground transition-colors">Total</div>
              <div className="text-3xl font-bold">
                {statsLoading ? "-" : <AnimatedNumber value={stats?.all ?? 0} />}
              </div>
            </Link>
            <Link to="/tickets?status=Open,In+Progress" className="flex-1 p-6 hover:bg-muted/50 transition-colors group">
              <div className="text-sm font-medium text-muted-foreground mb-2 group-hover:text-foreground transition-colors">Open and in progress</div>
              <div className="text-3xl font-bold">
                {statsLoading ? "-" : <AnimatedNumber value={openTotal} />}
              </div>
            </Link>
            <Link to="/tickets?sla=overdue" className="flex-1 p-6 hover:bg-rose-500/5 transition-colors group">
              <div className="text-sm font-medium text-rose-500 mb-2 group-hover:text-rose-600 transition-colors">Overdue</div>
              <div className="text-3xl font-bold text-rose-500">
                {statsLoading ? "-" : <AnimatedNumber value={stats?.overdue ?? 0} />}
              </div>
            </Link>
            <Link to="/tickets?status=Closed" className="flex-1 p-6 hover:bg-muted/50 transition-colors group">
              <div className="text-sm font-medium text-muted-foreground mb-2 group-hover:text-foreground transition-colors">SLA met</div>
              <div className="text-3xl font-bold">
                {statsLoading ? "-" : <AnimatedNumber value={stats?.sla_met_pct ?? 100} />}{statsLoading ? "" : "%"}
              </div>
            </Link>
          </div>
        </Card>

        {/* Priority Bar */}
        {!statsLoading && openTotal > 0 && (
          <div className="space-y-3 px-1">
            <div className="flex justify-between text-sm font-medium">
              <span>Open tickets by priority</span>
              <span className="text-muted-foreground">{openTotal} total</span>
            </div>
            <div className="h-3 flex rounded-full overflow-hidden bg-muted">
              <div className="bg-[var(--td-urgent)] transition-all duration-1000 ease-out" style={{ width: `${urgentPct}%` }} />
              <div className="bg-[var(--td-high)] transition-all duration-1000 ease-out" style={{ width: `${highPct}%` }} />
              <div className="bg-[var(--td-muted)] transition-all duration-1000 ease-out opacity-60" style={{ width: `${medLowPct}%` }} />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--td-urgent)]"/> Urgent</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--td-high)]"/> High</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--td-muted)] opacity-60"/> Med/Low</div>
            </div>
          </div>
        )}

        {/* Needs attention */}
        <Card className="col-span-1 border shadow-sm mt-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Needs attention</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Tickets needing your attention.</p>
            </div>
            <Link to="/tickets" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !recentTickets?.data?.length ? (
              <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                No tickets need attention right now. Great job!
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.data.map((ticket) => {
                  return (
                    <Link
                      key={ticket.ticket_id}
                      to={`/tickets/${ticket.ticket_id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                    >
                      <div className="shrink-0">
                        <SlaRing 
                          dueAt={ticket.due_at}
                          createdAt={ticket.created_at}
                          status={ticket.status}
                          priority={ticket.priority}
                          size="sm" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {ticket.customer_name}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <div className="text-right">
                           <span className={`text-xs font-medium whitespace-nowrap ${
                            formatTimeLeft(ticket.due_at, now, ticket.status).includes("overdue") 
                              ? "text-[var(--td-sla-overdue)]" 
                              : "text-muted-foreground"
                           }`}>
                            {formatTimeLeft(ticket.due_at, now, ticket.status)}
                           </span>
                        </div>
                        <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          ticket.status === 'Open' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-amber-500/10 text-amber-600'
                        }`}>
                          {ticket.status}
                        </div>
                        <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          ticket.priority === 'Urgent' ? 'bg-[var(--td-urgent)]/10 text-[var(--td-urgent)]' :
                          ticket.priority === 'High' ? 'bg-[var(--td-high)]/10 text-[var(--td-high)]' :
                          'bg-secondary text-secondary-foreground'
                        }`}>
                          {ticket.priority}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
