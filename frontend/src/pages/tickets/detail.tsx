import { useState } from "react";
import { useParams, Link } from "react-router";
import { Layout } from "@/components/layout";
import { useTicket, useUpdateTicket } from "@/hooks/useTickets";
import { SlaRing } from "@/components/ui/sla-ring";
import { formatTimeAgo, formatDateTime, formatTimeLeft } from "@/lib/format";
import { computeFrontendSlaState } from "@/lib/sla";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityMark } from "@/components/ui/priority-mark";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, CheckCircle2, Clock, MessageSquare, History, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="eyebrow">{label}</p>{children}</div>;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError } = useTicket(id!);
  const updateTicket = useUpdateTicket();
  const now = useNow();
  const [noteText, setNoteText] = useState("");

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (isError || !ticket) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl py-24 text-center">
          <h2 className="mb-2 text-2xl font-semibold">Ticket not found</h2>
          <p className="mb-6 text-muted-foreground">The ticket {id} does not exist or has been removed.</p>
          <Button asChild><Link to="/tickets">Back to tickets</Link></Button>
        </div>
      </Layout>
    );
  }

  const currentState = computeFrontendSlaState(ticket.status, ticket.due_at, ticket.created_at, ticket.priority, now);

  const handleUpdateStatus = (status: string) => {
    updateTicket.mutate({ id: ticket.ticket_id, payload: { status } }, { onSuccess: () => toast.success(`Status updated to ${status}`) });
  };
  const handleUpdatePriority = (priority: string) => {
    updateTicket.mutate({ id: ticket.ticket_id, payload: { priority } }, { onSuccess: () => toast.success(`Priority updated to ${priority}`) });
  };
  const handleAddNote = () => {
    if (!noteText.trim()) return;
    updateTicket.mutate({ id: ticket.ticket_id, payload: { notes: noteText } }, {
      onSuccess: () => { setNoteText(""); toast.success("Note added"); },
    });
  };

  const stateMeta = {
    overdue: { label: "Past due", color: "var(--td-sla-overdue)" },
    at_risk: { label: "At risk", color: "var(--td-sla-at-risk)" },
    resolved: { label: "Resolved", color: "var(--td-status-closed)" },
    on_track: { label: "On track", color: "var(--td-sla-on-track)" },
  }[currentState];

  const events = [
    { id: "open", kind: "open" as string, text: "Ticket created", at: ticket.created_at },
    ...ticket.notes.map((n) => ({ id: String(n.id), kind: n.kind as string, text: n.note_text, at: n.created_at })),
  ];

  return (
    <Layout>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0"><Link to="/tickets" aria-label="Back"><ArrowLeft className="size-4" /></Link></Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{ticket.ticket_id}</span>
              <StatusBadge status={ticket.status} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><PriorityMark priority={ticket.priority} size={14} />{ticket.priority}</span>
            </div>
            <h1 className="font-display mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{ticket.subject}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Opened {formatTimeAgo(ticket.created_at)} · last update {formatTimeAgo(ticket.updated_at)}</p>
          </div>
          {ticket.status !== "Closed" ? (
            <Button className="glow-primary hidden h-9 sm:inline-flex" onClick={() => handleUpdateStatus("Closed")}><CheckCircle2 className="size-4" />Resolve</Button>
          ) : (
            <Button variant="outline" className="hidden h-9 sm:inline-flex" onClick={() => handleUpdateStatus("Open")}>Reopen</Button>
          )}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="card-surface p-5 sm:p-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Avatar name={ticket.customer_name} email={ticket.customer_email} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{ticket.customer_name}</p>
                  <a href={`mailto:${ticket.customer_email}`} className="text-xs text-muted-foreground hover:text-primary">{ticket.customer_email}</a>
                </div>
                <span className="ml-auto hidden text-xs text-muted-foreground sm:block">{formatDateTime(ticket.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap pt-4 text-[14px] leading-relaxed">{ticket.description}</p>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-muted-foreground" />Activity <span className="text-xs font-normal text-muted-foreground">{events.length}</span></h2>
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
                {events.map((e) => {
                  const system = e.kind !== "note";
                  return (
                    <li key={e.id} className="relative flex gap-3">
                      <span className={`z-10 grid size-8 shrink-0 place-items-center rounded-full border border-border ${system ? "bg-background text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                        {e.kind === "open" ? <Ticket className="size-3.5" /> : system ? <CheckCircle2 className="size-3.5" /> : <MessageSquare className="size-3.5" />}
                      </span>
                      {system ? (
                        <div className="flex min-h-8 flex-1 items-center justify-between gap-3 text-[13px] text-muted-foreground"><span>{e.text}</span><time className="shrink-0 text-xs">{formatTimeAgo(e.at)}</time></div>
                      ) : (
                        <div className="card-surface flex-1 p-4">
                          <div className="mb-1.5 flex items-center justify-between"><span className="text-[13px] font-semibold">Support agent</span><time className="text-xs text-muted-foreground">{formatTimeAgo(e.at)}</time></div>
                          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{e.text}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="card-surface p-4">
              <Textarea
                placeholder="Write an internal note…"
                className="min-h-[96px] resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
              />
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="hidden text-xs text-muted-foreground sm:inline"><kbd className="rounded border border-border px-1 font-mono">⌘ Enter</kbd> to post</span>
                <Button className="ml-auto h-8" onClick={handleAddNote} disabled={!noteText.trim() || updateTicket.isPending}><Send className="size-3.5" />Add note</Button>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <section className="card-surface relative overflow-hidden p-5">
              <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stateMeta.color}, transparent)` }} />
              <div className="flex flex-col items-center gap-4 text-center">
                <SlaRing dueAt={ticket.due_at} createdAt={ticket.created_at} status={ticket.status} priority={ticket.priority} size="lg" />
                <div>
                  <p className="eyebrow">Response SLA</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: stateMeta.color }}>{stateMeta.label}</p>
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5 shrink-0" />{ticket.resolved_at ? `Resolved ${formatDateTime(ticket.resolved_at)}` : formatTimeLeft(ticket.due_at, now, ticket.status)}</p>
                </div>
              </div>
            </section>

            <section className="card-surface space-y-4 p-5">
              <Field label="Status">
                <Select value={ticket.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Open", "In Progress", "Closed"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={ticket.priority} onValueChange={handleUpdatePriority}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low", "Medium", "High", "Urgent"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Separator />
              <dl className="space-y-2.5 text-[13px]">
                <div className="flex justify-between"><dt className="text-muted-foreground">Due</dt><dd>{formatDateTime(ticket.due_at)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd>{formatDateTime(ticket.created_at)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Customer</dt><dd><Link to="/customers" className="hover:text-primary">{ticket.customer_name}</Link></dd></div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
