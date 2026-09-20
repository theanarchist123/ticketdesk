import type { TicketListItem, TicketDetail, Stats } from "./types";

const API_BASE = "/api";

export async function fetchTickets(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  priority?: string;
  sla?: string;
  sort?: string;
}): Promise<{ data: TicketListItem[]; total: number }> {
  const url = new URL(`${window.location.origin}${API_BASE}/tickets`);
  if (params?.status) url.searchParams.append("status", params.status);
  if (params?.search) url.searchParams.append("search", params.search);
  if (params?.limit) url.searchParams.append("limit", params.limit.toString());
  if (params?.offset) url.searchParams.append("offset", params.offset.toString());
  if (params?.priority) url.searchParams.append("priority", params.priority);
  if (params?.sla) url.searchParams.append("sla", params.sla);
  if (params?.sort) url.searchParams.append("sort", params.sort);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch tickets");
  
  const data = await res.json();
  const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
  
  return { data, total };
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await fetch(`${API_BASE}/tickets/${id}`);
  if (!res.ok) throw new Error("Failed to fetch ticket");
  return res.json();
}

export async function updateTicket(
  id: string,
  payload: { status?: string; priority?: string; notes?: string }
): Promise<{ success: boolean; updated_at: string }> {
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update ticket");
  return res.json();
}

export async function createTicket(
  payload: { customer_name: string; customer_email: string; subject: string; description: string; priority: string }
): Promise<{ ticket_id: string; created_at: string; due_at: string }> {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create ticket");
  return res.json();
}
