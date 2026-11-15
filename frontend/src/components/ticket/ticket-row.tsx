import { Link } from "react-router";
import { format } from "date-fns";
import { SlaRing } from "@/components/ui/sla-ring";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityMark } from "@/components/ui/priority-mark";
import { formatTimeLeft, formatTimeAgo } from "@/lib/format";
import { computeFrontendSlaState, getSlaColor } from "@/lib/sla";

export interface TicketRowProps {
  ticket: any;
  now: Date;
  index?: number;
}

export function TicketRow({ ticket, now, index = 0 }: TicketRowProps) {
  const state = computeFrontendSlaState(ticket.status, ticket.due_at, ticket.created_at, ticket.priority, now);
  return (
    <Link
      to={`/tickets/${ticket.ticket_id}`}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      className="row-in group relative grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-5 py-3.5 transition-all duration-200 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:origin-center before:scale-y-0 before:rounded-r before:bg-primary before:transition-transform hover:bg-white/[0.04] hover:before:scale-y-100 md:grid-cols-[24px_minmax(0,1fr)_150px_110px_130px]"
    >
      <SlaRing dueAt={ticket.due_at} createdAt={ticket.created_at} status={ticket.status} priority={ticket.priority} size="sm" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{ticket.ticket_id}</span>
          <h3 className="truncate text-[13px] font-medium group-hover:text-primary">{ticket.subject}</h3>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{ticket.customer_email}</p>
      </div>
      <div className="col-start-2 flex min-w-0 items-center gap-2 text-xs md:col-start-auto">
        <Avatar name={ticket.customer_name} email={ticket.customer_email || ticket.customer_name} size="sm" />
        <span className="truncate">{ticket.customer_name}</span>
      </div>
      <div className="col-start-2 flex items-center gap-2 md:col-start-auto">
        <PriorityMark priority={ticket.priority} size={14} />
        <span className="text-xs text-muted-foreground">{ticket.priority}</span>
      </div>
      <div className="col-start-2 flex items-center justify-between gap-3 md:col-start-auto md:flex-col md:items-end md:gap-1">
        <StatusBadge status={ticket.status} />
        <span title={format(new Date(ticket.created_at), "MMM d, yyyy h:mm a")} className={`text-[11px] tabular-nums ${ticket.status === "Closed" ? "text-muted-foreground" : getSlaColor(state)}`}>
          {ticket.status === "Closed" ? formatTimeAgo(ticket.created_at) : formatTimeLeft(ticket.due_at, now, ticket.status)}
        </span>
      </div>
    </Link>
  );
}
