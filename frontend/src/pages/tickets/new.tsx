import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { useCreateTicket, useStats } from "@/hooks/useTickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router";

const schema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters."),
  customer_email: z.string().email("Please enter a valid email address."),
  subject: z.string().min(5, "Subject must be at least 5 characters."),
  description: z.string().min(10, "Please provide more details (at least 10 chars)."),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
});

type FormValues = z.infer<typeof schema>;

export default function NewTicketPage() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();
  const { data: stats, isLoading: statsLoading } = useStats();
  
  const estimatedNextId = statsLoading 
    ? "TKT-..." 
    : `TKT-${String((stats?.all || 0) + 1).padStart(3, '0')}`;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: "Medium",
    },
  });

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
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/tickets"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Ticket</h1>
            <p className="text-muted-foreground mt-1">
              Create a new customer support ticket.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Ticket Details</CardTitle>
                  <CardDescription>Fill out the information below to log the issue.</CardDescription>
                </div>
                <div className="bg-muted px-3 py-1 rounded-md border font-mono text-sm text-muted-foreground">
                  {estimatedNextId}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input 
                    id="customer_name" 
                    placeholder="Jane Doe" 
                    {...register("customer_name")} 
                    aria-invalid={!!errors.customer_name}
                  />
                  {errors.customer_name && (
                    <p className="text-sm text-rose-500 font-medium">{errors.customer_name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input 
                    id="customer_email" 
                    type="email"
                    placeholder="jane@example.com" 
                    {...register("customer_email")} 
                    aria-invalid={!!errors.customer_email}
                  />
                  {errors.customer_email && (
                    <p className="text-sm text-rose-500 font-medium">{errors.customer_email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject" 
                  placeholder="Brief summary of the issue..." 
                  {...register("subject")} 
                  aria-invalid={!!errors.subject}
                />
                {errors.subject && (
                  <p className="text-sm text-rose-500 font-medium">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Detailed explanation of the issue, steps to reproduce, or any relevant context..." 
                  className="min-h-[120px]"
                  {...register("description")} 
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-sm text-rose-500 font-medium">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={watch("priority")} 
                  onValueChange={(val: any) => setValue("priority", val, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low (48h SLA)</SelectItem>
                    <SelectItem value="Medium">Medium (24h SLA)</SelectItem>
                    <SelectItem value="High">High (12h SLA)</SelectItem>
                    <SelectItem value="Urgent">Urgent (4h SLA)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-rose-500 font-medium">{errors.priority.message}</p>
                )}
              </div>

            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t pt-6 bg-muted/20">
              <Button type="button" variant="outline" asChild>
                <Link to="/tickets">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || createTicket.isPending}>
                {(isSubmitting || createTicket.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Create Ticket
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
