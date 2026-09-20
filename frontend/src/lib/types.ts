export type SLAState = "on_track" | "at_risk" | "overdue" | "resolved";

export interface Note {
  id: number;
  note_text: string;
  kind: "note" | "status_change" | "priority_change";
  created_at: string;
}

export interface TicketListItem {
  ticket_id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  status: "Open" | "In Progress" | "Closed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  due_at: string;
  sla_state: SLAState;
  created_at: string;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  updated_at: string;
  resolved_at: string | null;
  notes: Note[];
}

export interface Stats {
  all: number;
  open: number;
  in_progress: number;
  closed: number;
  overdue: number;
  sla_met_pct?: number;
  by_priority?: Record<string, number>;
}
