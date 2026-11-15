import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { useCreateTicket } from "@/hooks/useTickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Ticket as TicketIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityMark } from "@/components/ui/priority-mark";
import { SlaRing } from "@/components/ui/sla-ring";
import { SLA_HOURS } from "@/lib/sla";

// Letters from any language, plus spaces, dots, hyphens and apostrophes (e.g. "Mary-Jane O'Neil Jr.")
const NAME_RE = /^\p{L}[\p{L}\p{M}\s.'’-]*$/u;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const schema = z.object({
  customer_name: z.string().trim()
    .min(1, "Customer name is required.")
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name is too long (60 characters max).")
    .regex(NAME_RE, "Name can only contain letters, spaces, hyphens and apostrophes — no numbers or symbols."),
  customer_email: z.string().trim()
    .min(1, "Email is required.")
    .regex(EMAIL_RE, "Enter a valid email, like name@company.com."),
  subject: z.string().trim()
    .min(1, "Subject is required.")
    .min(5, "Subject must be at least 5 characters.")
    .max(100, "Subject is too long (100 characters max)."),
  description: z.string().trim()
    .min(1, "Description is required.")
    .min(10, "Please add a bit more detail (at least 10 characters).")
    .max(2000, "Description is too long (2000 characters max)."),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
});

type FormValues = z.infer<typeof schema>;

const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export default function NewTicketPage() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, touchedFields, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "all", // validate on every change AND on blur, so leaving a field empty flags it immediately
    criteriaMode: "firstError",
    defaultValues: {
      priority: "Medium",
    },
  });

  const formValues = watch();
  const subjectLength = formValues.subject?.length || 0;

  // Inline feedback for one field: red message when invalid, green tick when valid.
  const FieldStatus = ({ name }: { name: keyof FormValues }) => {
    const err = errors[name];
    if (err) return <p role="alert" className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--td-urgent)]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{err.message}</p>;
    if (dirtyFields[name] || touchedFields[name]) return <p className="flex items-center gap-1.5 text-[13px] text-[var(--td-status-closed)]"><CheckCircle2 className="size-3.5" />Looks good</p>;
    return null;
  };
  const fieldCls = (name: keyof FormValues) =>
    `bg-[var(--td-bg)] transition-colors ${errors[name] ? "border-[var(--td-urgent)] focus-visible:ring-[var(--td-urgent)]/40" : dirtyFields[name] ? "border-[var(--td-status-closed)]/60" : "border-[var(--td-border)]"}`;

  const onSubmit = async (data: FormValues) => {
    try {
      await createTicket.mutateAsync(data);
      toast.success("Ticket created successfully");
      navigate("/tickets");
    } catch (error) {
      toast.error("Failed to create ticket. Please try again.");
    }
  };

  return (
    <Layout>
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/tickets"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New ticket</h1>
            <p className="text-[var(--td-muted)] mt-1">
              Create a new customer support ticket.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Card className="bg-[var(--td-surface)] border-[var(--td-border)]">
              <CardHeader>
                <CardTitle>Ticket details</CardTitle>
                <CardDescription className="text-[var(--td-muted)]">Fill out the information below to log the issue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer name <span className="text-rose-500">*</span></Label>
                    <Input 
                      id="customer_name" 
                      placeholder="Jane Doe" 
                      className={fieldCls("customer_name")}
                      autoComplete="off"
                      {...register("customer_name")}
                      aria-invalid={!!errors.customer_name}
                    />
                    <FieldStatus name="customer_name" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Customer email <span className="text-rose-500">*</span></Label>
                    <Input 
                      id="customer_email" 
                      type="email"
                      placeholder="jane@example.com" 
                      className={fieldCls("customer_email")}
                      {...register("customer_email")}
                      aria-invalid={!!errors.customer_email}
                    />
                    <FieldStatus name="customer_email" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="subject">Subject <span className="text-rose-500">*</span></Label>
                    <span className={`text-xs ${subjectLength > 100 ? 'text-rose-500' : 'text-[var(--td-muted)]'}`}>
                      {subjectLength} / 100
                    </span>
                  </div>
                  <Input 
                    id="subject" 
                    placeholder="Brief summary of the issue..." 
                    className={fieldCls("subject")}
                    {...register("subject")}
                    aria-invalid={!!errors.subject}
                  />
                  <FieldStatus name="subject" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description <span className="text-rose-500">*</span></Label>
                  <Textarea 
                    id="description" 
                    placeholder="Detailed explanation of the issue, steps to reproduce, or any relevant context..." 
                    className={`min-h-[120px] ${fieldCls("description")}`}
                    {...register("description")}
                    aria-invalid={!!errors.description}
                  />
                  <FieldStatus name="description" />
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <div className="flex flex-col sm:flex-row bg-[var(--td-bg)] p-1 rounded-lg relative gap-1 border border-[var(--td-border)]">
                    {PRIORITIES.map((p) => {
                      const isActive = formValues.priority === p;
                      const slaHours = SLA_HOURS[p] || 24;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setValue("priority", p, { shouldValidate: true })}
                          className={`relative z-10 flex-1 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-md ${
                            isActive ? "text-[var(--td-text)]" : "text-[var(--td-muted)] hover:text-[var(--td-text)] bg-[var(--td-surface)]"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{p}</span>
                            <span className="opacity-50">·</span>
                            <span className="opacity-70">{slaHours}h</span>
                          </div>
                          {isActive && (
                            <motion.div
                              layoutId="priority-tab"
                              className="absolute inset-0 bg-[var(--td-raised)] rounded-md shadow-sm border border-[var(--td-border)] -z-10"
                              initial={false}
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {errors.priority && (
                    <p className="text-sm text-rose-500 font-medium">{errors.priority.message}</p>
                  )}
                </div>

              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t border-[var(--td-border)] pt-6 bg-[var(--td-raised)]/20">
                <Button type="button" variant="outline" asChild>
                  <Link to="/tickets">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting || createTicket.isPending} className="bg-[var(--td-primary)] text-white hover:opacity-90">
                  {(isSubmitting || createTicket.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create ticket
                </Button>
              </CardFooter>
            </Card>
          </form>

          {/* Live Preview */}
          <div className="hidden lg:block sticky top-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--td-muted)] flex items-center gap-2">
              <TicketIcon className="w-5 h-5" /> Live preview
            </h3>
            
            <div className="bg-[var(--td-surface)] border border-[var(--td-border)] rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-col p-4 gap-4 bg-[var(--td-raised)]/50 border-b border-[var(--td-border)]">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    <SlaRing 
                      dueAt={new Date(Date.now() + (SLA_HOURS[formValues.priority || "Medium"] || 24) * 3600000).toISOString()} 
                      createdAt={new Date().toISOString()} 
                      status="Open" 
                      priority={formValues.priority || "Medium"} 
                      size="sm" 
                      animate={false}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <h3 className="font-medium truncate text-[var(--td-text)]">
                      {formValues.subject || "Ticket subject will appear here"}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-[var(--td-muted)] truncate">
                      <Avatar 
                        name={formValues.customer_name || "New User"} 
                        email={formValues.customer_email || "user@example.com"} 
                        size="sm" 
                      />
                      <span className="font-medium text-[var(--td-text)]">{formValues.customer_name || "New User"}</span>
                      <span>•</span>
                      <span>Created just now</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 w-auto">
                    <div className="flex items-center gap-2">
                      <PriorityMark priority={formValues.priority || "Medium"} />
                      <StatusBadge status="Open" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-[var(--td-text)] opacity-80">
                  {formValues.description || "The ticket description will be displayed here..."}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--td-border)] bg-[var(--td-raised)]/40 px-6 py-3 text-xs text-[var(--td-muted)]">
                <span>Response target</span>
                <span className="font-medium text-[var(--td-text)]">{formValues.priority || "Medium"} · within {SLA_HOURS[formValues.priority || "Medium"]} hours</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
