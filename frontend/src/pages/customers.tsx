import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, Users, ArrowUpRight, Ticket } from "lucide-react";
import { Layout } from "@/components/layout";
import { HBars } from "@/components/charts";
import { useAnalytics } from "@/hooks/useTickets";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTickets } from "@/hooks/useTickets";
import type { TicketListItem } from "@/lib/types";

type Customer = { name: string; email: string; tickets: TicketListItem[]; active: number; latest: string };

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data: an } = useAnalytics();
  const { data, isLoading, isError } = useTickets({ limit: 200, sort: "newest" });
  const customers = useMemo(() => {
    const grouped = new Map<string, Customer>();
    for (const ticket of data?.data ?? []) {
      const email = ticket.customer_email.toLowerCase();
      const customer = grouped.get(email) ?? { name: ticket.customer_name, email: ticket.customer_email, tickets: [], active: 0, latest: ticket.created_at };
      customer.tickets.push(ticket);
      if (ticket.status !== "Closed") customer.active++;
      if (ticket.created_at > customer.latest) customer.latest = ticket.created_at;
      grouped.set(email, customer);
    }
    return [...grouped.values()].sort((a, b) => b.latest.localeCompare(a.latest));
  }, [data]);
  const filtered = customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(search.toLowerCase()));

  return <Layout>
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-medium text-muted-foreground">Relationships</p><h1 className="font-display text-3xl font-semibold tracking-[-0.04em]">Customers</h1><p className="mt-2 text-sm text-muted-foreground">People behind the requests, with their recent support history.</p></div>
        <div className="relative w-full sm:w-[300px]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a customer" className="h-10 rounded-lg bg-card pl-9" /></div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Customers", v: an ? an.customers.total : "—", c: "var(--primary)" },
          { l: "Repeat customers", v: an && an.customers.total ? `${Math.round((an.customers.repeat / an.customers.total) * 100)}%` : "—", c: "var(--td-status-open)" },
          { l: "Avg. tickets each", v: an ? an.customers.avg_tickets.toFixed(1) : "—", c: "var(--td-status-in-progress)" },
          { l: "Need attention", v: an ? an.customers.with_active : "—", c: "var(--td-sla-at-risk)" },
        ].map((s) => (
          <div key={s.l} className="card-surface lift p-4"><p className="eyebrow">{s.l}</p><p className="stat mt-2 text-3xl leading-none" style={{ color: s.c }}>{s.v}</p></div>
        ))}
      </div>
      {!!an?.top_customers.length && (
        <div className="card-surface mb-5 p-5">
          <h2 className="mb-4 text-sm font-semibold">Tickets per customer</h2>
          <HBars data={an.top_customers.map((c) => ({ label: c.name, sub: `${c.active} active`, value: c.total }))} />
        </div>
      )}
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground"><span>{data?.total ?? 0} tickets in history</span><span>{customers.length} customers</span></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_100px_110px_minmax(0,1fr)] gap-4 border-b border-border bg-muted/50 px-5 py-3 text-[10px] font-semibold text-muted-foreground sm:grid"><span>Customer</span><span>Tickets</span><span>Open</span><span>Latest request</span></div>
        {isLoading ? <div className="space-y-3 p-5">{[0,1,2,3].map(x => <div key={x} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div> : isError ? <div className="p-12 text-center text-sm text-muted-foreground">Couldn’t load customer history. Try again in a moment.</div> : !filtered.length ? <div className="px-6 py-14 text-center"><Users className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-sm font-medium">No customers found</p><p className="mt-1 text-xs text-muted-foreground">Try a different name or email.</p></div> : <div className="divide-y divide-border">{filtered.map(customer => {
          const recent = customer.tickets[0];
          return <div key={customer.email} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1.5fr)_100px_110px_minmax(0,1fr)] sm:gap-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3"><Avatar name={customer.name} email={customer.email} size="md" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{customer.name}</p><p className="truncate text-xs text-muted-foreground">{customer.email}</p></div></div>
            <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground"><Ticket className="size-3.5 sm:hidden" />{customer.tickets.length}<span className="hidden sm:inline">{customer.tickets.length === 1 ? "ticket" : "tickets"}</span></div>
            <div className="hidden sm:block">{customer.active ? <span className="text-xs font-medium">{customer.active} active</span> : <span className="text-xs text-muted-foreground">All resolved</span>}</div>
            {recent && <Link to={`/tickets/${recent.ticket_id}`} className="col-span-2 flex min-w-0 items-center gap-2 rounded-lg bg-background px-3 py-2 hover:bg-muted sm:col-span-1"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{recent.subject}</p><div className="mt-1 flex items-center gap-2"><span className="font-mono text-[10px] text-muted-foreground">{recent.ticket_id}</span><StatusBadge status={recent.status} /></div></div><ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" /></Link>}
          </div>;
        })}</div>}
      </div>
      {data && data.total > data.data.length && <p className="mt-3 text-center text-xs text-muted-foreground">Showing customers from the latest {data.data.length} tickets.</p>}
    </div>
  </Layout>;
}
