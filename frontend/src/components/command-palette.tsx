import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTickets } from "@/hooks/useTickets";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Search, TicketIcon, PlusCircle, Monitor, Moon, Sun, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function CommandPalette({ open, setOpen }: { open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  // Fetch recent tickets if search is empty, otherwise fetch search results
  const { data: ticketsData, isLoading } = useTickets({
    search: search || undefined,
    limit: 5,
  });

  const tickets = ticketsData?.data || [];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // Shortcut to create new ticket when 'n' is pressed outside of inputs
      if (e.key === "n" && !open && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        navigate("/tickets/new");
      }
      
      // Shortcut to focus search when '/' is pressed outside of inputs
      if (e.key === "/" && !open && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, navigate, setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search tickets or jump to..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{isLoading ? "Searching..." : "No results found."}</CommandEmpty>
        
        {!search && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => navigate("/tickets/new"))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Create new ticket</span>
              <CommandShortcut>n</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/tickets"))}>
              <Search className="mr-2 h-4 w-4" />
              <span>Go to queue</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading={search ? "Tickets" : "Recent Tickets"}>
          {tickets.map((ticket) => (
            <CommandItem 
              key={ticket.ticket_id} 
              onSelect={() => runCommand(() => navigate(`/tickets/${ticket.ticket_id}`))}
            >
              <TicketIcon className="mr-2 h-4 w-4 text-[var(--td-muted)]" />
              <span className="font-mono text-xs mr-2 text-[var(--td-muted)]">{ticket.ticket_id}</span>
              <span className="truncate">{ticket.subject}</span>
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  ticket.status === 'Open' ? 'bg-[var(--td-sla-on-track)]/10 text-[var(--td-sla-on-track)]' :
                  ticket.status === 'In Progress' ? 'bg-[var(--td-sla-at-risk)]/10 text-[var(--td-sla-at-risk)]' :
                  'bg-[var(--td-muted)]/10 text-[var(--td-muted)]'
                }`}>
                  {ticket.status}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        {!search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Theme">
              <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>System</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
