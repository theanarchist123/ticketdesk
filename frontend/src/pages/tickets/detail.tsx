import { useState } from "react";
import { useParams, Link } from "react-router";
import { Layout } from "@/components/layout";
import { useTicket, useUpdateTicket } from "@/hooks/useTickets";
import { SlaRing } from "@/components/ui/sla-ring";
import { formatTimeAgo, formatDateTime, formatTimeLeft } from "@/lib/format";
import { computeFrontendSlaState } from "@/lib/sla";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ArrowLeft, Send, CheckCircle2, Circle, Clock, MessageSquare, History, User, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError } = useTicket(id!);
  const updateTicket = useUpdateTicket();
  const now = useNow();
  const [noteText, setNoteText] = useState("");

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (isError || !ticket) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center py-24">
          <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The ticket {id} does not exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/tickets">Return to Queue</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const currentState = computeFrontendSlaState(
    ticket.status,
    ticket.due_at,
    ticket.created_at,
    ticket.priority,
    now
  );

  const handleUpdateStatus = (status: string) => {
    updateTicket.mutate({ id: ticket.ticket_id, payload: { status } }, {
      onSuccess: () => toast.success(`Status updated to ${status}`)
    });
  };

  const handleUpdatePriority = (priority: string) => {
    updateTicket.mutate({ id: ticket.ticket_id, payload: { priority } }, {
      onSuccess: () => toast.success(`Priority updated to ${priority}`)
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    updateTicket.mutate({ id: ticket.ticket_id, payload: { notes: noteText } }, {
      onSuccess: () => {
        setNoteText("");
        toast.success("Note added");
      }
    });
  };

  const StatusStepper = () => {
    const statuses = ["Open", "In Progress", "Closed"];
    const currentIndex = statuses.indexOf(ticket.status);

    return (
      <div className="flex items-center w-full my-6">
        {statuses.map((s, idx) => {
          const isCompleted = idx < currentIndex || ticket.status === "Closed";
          const isCurrent = idx === currentIndex;
          
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isCompleted ? "bg-primary border-primary text-primary-foreground" :
                  isCurrent ? "border-primary text-primary bg-background" :
                  "border-muted bg-background text-muted-foreground"
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
                   isCurrent ? <Circle className="w-4 h-4 fill-current" /> :
                   <Circle className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-medium absolute top-10 whitespace-nowrap ${
                  isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {s}
                </span>
              </div>
              {idx < statuses.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  isCompleted ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Main Content Column */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link to="/tickets"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                  {ticket.subject}
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {ticket.ticket_id}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Opened {formatTimeAgo(ticket.created_at)} by <span className="font-medium text-foreground">{ticket.customer_name}</span>
              </p>
            </div>
          </div>

          <Card className="bg-[var(--td-surface)] border-[var(--td-border)]">
            <CardHeader className="pb-4 border-b border-[var(--td-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--td-raised)] flex items-center justify-center">
                  <User className="w-5 h-5 text-[var(--td-muted)]" />
                </div>
                <div>
                  <div className="font-medium">{ticket.customer_name}</div>
                  <div className="text-sm text-[var(--td-muted)]">{ticket.customer_email}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-[var(--td-text)]">
                {ticket.description}
              </div>
            </CardContent>
          </Card>

          {/* Composer */}
          <Card className="shadow-sm border-[var(--td-border)] bg-[var(--td-surface)]">
            <CardContent className="p-4">
              <Textarea 
                placeholder="Type a note to add to the timeline..."
                className="h-[120px] resize-none bg-[var(--td-bg)] border-[var(--td-border)] focus-visible:ring-[var(--td-primary)] mb-3"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddNote();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--td-muted)] hidden sm:inline-block">Press <kbd className="font-mono bg-[var(--td-raised)] px-1 rounded">⌘ Enter</kbd> to submit</span>
                <Button 
                  className="bg-[var(--td-primary)] text-white hover:opacity-90 ml-auto"
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || updateTicket.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Add note
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <div className="mt-2 mb-12">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-[var(--td-muted)]" /> Activity timeline
            </h3>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-[2px] before:bg-[var(--td-border)]">
              
              {/* Original Post Marker */}
              <div className="relative flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-[4px] border-[var(--td-bg)] bg-[var(--td-raised)] text-[var(--td-muted)] z-10 shrink-0">
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="flex-1 p-4 rounded-xl border border-[var(--td-border)] bg-[var(--td-surface)] shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">Ticket Opened</span>
                    <time className="text-xs text-[var(--td-muted)]">{formatDateTime(ticket.created_at)}</time>
                  </div>
                  <p className="text-sm text-[var(--td-muted)]">System received the ticket.</p>
                </div>
              </div>

              {ticket.notes.map((note) => (
                <div key={note.id} className="relative flex items-start gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-[4px] border-[var(--td-bg)] z-10 shrink-0 ${
                    note.kind === 'status_change' ? 'bg-[var(--td-primary)] text-white' : 'bg-[var(--td-raised)] text-[var(--td-text)]'
                  }`}>
                    {note.kind === 'status_change' ? <CheckCircle2 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4 text-[var(--td-muted)]" />}
                  </div>
                  <div className="flex-1 p-4 rounded-xl border border-[var(--td-border)] bg-[var(--td-surface)] shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {note.kind === 'status_change' ? 'System' : 'Support Agent'}
                      </span>
                      <time className="text-xs text-[var(--td-muted)]">{formatDateTime(note.created_at)}</time>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${note.kind === 'status_change' ? 'text-[var(--td-muted)] font-medium' : 'text-[var(--td-text)]'}`}>
                      {note.note_text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <Card className="overflow-hidden">
            <div className={`h-2 w-full ${
              currentState === 'overdue' ? 'bg-rose-500' :
              currentState === 'at_risk' ? 'bg-amber-500' :
              currentState === 'resolved' ? 'bg-neutral-500' : 'bg-emerald-500'
            }`} />
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                  <div className="flex justify-center mb-6">
                    <SlaRing 
                      dueAt={ticket.due_at} 
                      createdAt={ticket.created_at} 
                      status={ticket.status} 
                      priority={ticket.priority} 
                      size="lg" 
                    />
                  </div>
                <h3 className="font-bold text-xl mb-1">
                  {currentState === 'overdue' ? 'SLA Overdue' :
                   currentState === 'at_risk' ? 'SLA At Risk' :
                   currentState === 'resolved' ? 'SLA Met' : 'SLA On Track'}
                </h3>
                {ticket.status !== "Closed" && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium text-foreground">{formatTimeLeft(ticket.due_at, now, ticket.status)}</span>
                  </p>
                )}
                {ticket.resolved_at && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Resolved {formatDateTime(ticket.resolved_at)}
                  </p>
                )}
              </div>

              <div className="mt-6 mb-8">
                <StatusStepper />
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Status</label>
                  <Select value={ticket.status} onValueChange={handleUpdateStatus}>
                    <SelectTrigger className="w-full font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                  <Select value={ticket.priority} onValueChange={handleUpdatePriority}>
                    <SelectTrigger className="w-full font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
