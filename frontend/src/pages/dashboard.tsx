import { Link } from "react-router";
import { Layout } from "@/components/layout";
import { useStats, useTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlaRing } from "@/components/ui/sla-ring";

import { useNow } from "@/hooks/useNow";
import { formatTimeLeft } from "@/lib/format";
import { AlertCircle, Clock, CheckCircle2, TicketIcon } from "lucide-react";
import { motion } from "motion/react";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentTickets, isLoading: ticketsLoading } = useTickets({
    limit: 6,
    status: "Open,In Progress", 
  });
  const now = useNow();

  const statCards = [
    {
      title: "Total Tickets",
      value: stats?.all ?? "-",
      icon: TicketIcon,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Open & In Progress",
      value: (stats?.open ?? 0) + (stats?.in_progress ?? 0) || "-",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Overdue",
      value: stats?.overdue ?? "-",
      icon: AlertCircle,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      title: "Resolved",
      value: stats?.closed ?? "-",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your support queue today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-md ${stat.bg}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="text-3xl font-bold">{stat.value}</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Needs attention */}
        <Card className="col-span-1 border shadow-sm">
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
                              ? "text-rose-500" 
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
                          ticket.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-500' :
                          ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-500' :
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
