import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router";
import { LayoutDashboard, Ticket, Bell, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStats, useTickets } from "@/hooks/useTickets";
import { CommandPalette } from "@/components/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTimeLeft } from "@/lib/format";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Ticket, label: "Tickets", href: "/tickets" },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isTicketsPage = location.pathname === "/tickets";
  const [commandOpen, setCommandOpen] = useState(false);
  
  const { data: stats } = useStats();
  const { data: overdueTickets } = useTickets({ limit: 5, sla: "overdue" } as any);
  const overdueCount = stats?.overdue || 0;
  const now = new Date();

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card/50 backdrop-blur-xl flex flex-col fixed inset-y-0 z-20">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            TicketDesk
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
                            (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
               <span className="text-sm font-medium leading-none">Support team</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="relative w-96">
            {!isTicketsPage && (
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground bg-muted/50 border rounded-md hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => setCommandOpen(true)}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span>Search tickets...</span>
                </div>
                <kbd className="inline-flex items-center rounded border px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                  <Bell className="w-5 h-5" />
                  {overdueCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                  Overdue tickets
                  {overdueCount > 0 && (
                    <span className="bg-rose-500/10 text-rose-500 text-xs px-2 py-0.5 rounded-full">
                      {overdueCount}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(!overdueTickets?.data || overdueTickets.data.length === 0) ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Nothing is overdue.
                  </div>
                ) : (
                  <>
                    {overdueTickets.data.map((ticket) => (
                      <DropdownMenuItem key={ticket.ticket_id} asChild>
                        <Link to={`/tickets/${ticket.ticket_id}`} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                          <span className="text-sm font-medium leading-none">{ticket.subject}</span>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground truncate w-full">{ticket.ticket_id} • {ticket.customer_name}</span>
                            <span className="text-xs font-medium text-rose-500 whitespace-nowrap ml-2">
                              {formatTimeLeft(ticket.due_at, now, ticket.status)}
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="justify-center text-primary font-medium">
                      <Link to="/tickets?sla=overdue">View all overdue</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {!isTicketsPage && (
              <Button asChild>
                <Link to="/tickets/new">New ticket</Link>
              </Button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>

      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
}
