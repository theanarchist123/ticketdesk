import { Link } from "react-router";
import { format } from "date-fns";
import { motion } from "motion/react";
import { SlaRing } from "@/components/ui/sla-ring";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityMark } from "@/components/ui/priority-mark";
import { formatTimeLeft } from "@/lib/format";
import { computeFrontendSlaState } from "@/lib/sla";

export interface TicketRowProps {
  ticket: any;
  now: Date;
  index?: number;
}

export function TicketRow({ ticket, now, index = 0 }: TicketRowProps) {
  const currentState = computeFrontendSlaState(
    ticket.status,
    ticket.due_at,
    ticket.created_at,
    ticket.priority,
    now
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link 
        to={`/tickets/${ticket.ticket_id}`}
        className="flex flex-col sm:flex-row items-start sm:items-center p-4 hover:bg-[var(--td-raised)] transition-colors gap-4 group border-b last:border-b-0"
      >
        <div className="flex-shrink-0 w-8 flex justify-center">
          <SlaRing 
            dueAt={ticket.due_at}
            createdAt={ticket.created_at}
            status={ticket.status}
            priority={ticket.priority}
            size="sm" 
          />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-[var(--td-muted)]">
              {ticket.ticket_id}
            </span>
            <h3 className="font-medium truncate group-hover:text-[var(--td-primary)] transition-colors">
              {ticket.subject}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--td-muted)] truncate">
            <Avatar name={ticket.customer_name} email={ticket.customer_email || ticket.customer_name} size="sm" />
            <span className="font-medium text-[var(--td-text)]">{ticket.customer_name}</span>
            <span>•</span>
            <span>Created {format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <PriorityMark priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          {ticket.status !== "Closed" && (
            <span className={`text-xs font-medium ${
              currentState === 'overdue' ? 'text-[var(--td-sla-overdue)]' :
              currentState === 'at_risk' ? 'text-[var(--td-sla-at-risk)]' : 'text-[var(--td-sla-resolved)]'
            }`}>
              {formatTimeLeft(ticket.due_at, now, ticket.status)}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
