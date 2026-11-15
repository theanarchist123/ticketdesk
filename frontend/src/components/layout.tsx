import { type ReactNode, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { BarChart3, Columns3, Flame, Inbox, LayoutGrid, Plus, Search, Ticket, Timer, Users, Timer as Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStats } from "@/hooks/useTickets";
import { CommandPalette } from "@/components/command-palette";

const workspace = [
  { icon: LayoutGrid, label: "Overview", href: "/" },
  { icon: Inbox, label: "Tickets", href: "/tickets" },
  { icon: Columns3, label: "Board", href: "/board" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
];

const titles: Record<string, string> = { "/": "Overview", "/tickets": "Tickets", "/board": "Board", "/customers": "Customers", "/reports": "Reports", "/sla": "SLA policies", "/tickets/new": "New ticket" };

// Pages still wrap themselves in <Layout>; the real shell lives in <AppShell> (a route layout)
// so the sidebar persists across navigation and its indicator can animate between items.
export function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const { data: stats } = useStats();
  const path = location.pathname;
  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`)) && !(href === "/tickets" && path === "/tickets/new");
  const title = titles[path] ?? (path.startsWith("/tickets/") ? "Ticket" : "");
  const activeCount = (stats?.open ?? 0) + (stats?.in_progress ?? 0);

  // "g then x" style navigation + "c" to create
  useEffect(() => {
    let armed = false;
    let timer: number;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey) return;
      if (armed) {
        const map: Record<string, string> = { o: "/", t: "/tickets", b: "/board", c: "/customers", r: "/reports" };
        if (map[e.key]) navigate(map[e.key]);
        armed = false;
        return;
      }
      if (e.key === "g") { armed = true; window.clearTimeout(timer); timer = window.setTimeout(() => (armed = false), 1200); }
      if (e.key === "c") navigate("/tickets/new");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const item = (active: boolean) => cn(
    "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-[color,background-color,transform] duration-200 hover:translate-x-0.5 [&>svg]:relative [&>svg]:z-10 [&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:scale-110",
    active ? "text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
  );
  const pill = (active: boolean) => active && (
    <>
      <motion.span layoutId="nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-lg bg-primary/10 ring-1 ring-primary/20" />
      <motion.span layoutId="nav-bar" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute -left-3 top-2 h-5 w-[3px] rounded-r bg-primary" />
    </>
  );

  return (
    <div className="min-h-screen text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-sidebar/90 backdrop-blur md:flex">
        <Link to="/" className="flex h-16 items-center gap-3 px-5">
          <span className="glow-primary grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Ticket className="size-4" strokeWidth={2.5} /></span>
          <div className="leading-tight"><p className="text-[15px] font-semibold tracking-tight">TicketDesk</p><p className="text-[11px] text-muted-foreground">Support workspace</p></div>
        </Link>

        <div className="px-3 pb-3">
          <button onClick={() => setCommandOpen(true)} className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background/60 px-3 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground">
            <Search className="size-3.5" />Search…<kbd className="ml-auto rounded border border-border px-1.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
          <div>
            <p className="eyebrow px-3 pb-2">Workspace</p>
            <div className="space-y-0.5">
              {workspace.map((l) => (
                <Link key={l.href} to={l.href} className={item(isActive(l.href))}>
                  {pill(isActive(l.href))}
                  <l.icon className="size-4" strokeWidth={1.8} /><span className="relative z-10">{l.label}</span>
                  {l.href === "/tickets" && activeCount > 0 && <span className="relative z-10 ml-auto rounded-md bg-white/5 px-1.5 text-[11px] tabular-nums text-muted-foreground">{activeCount}</span>}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow px-3 pb-2">Views</p>
            <div className="space-y-0.5">
              <Link to="/tickets?sla=overdue" className={item(false)}>
                <Flame className="size-4 text-[var(--td-sla-overdue)]" strokeWidth={1.8} />Past due
                {!!stats?.overdue && <span className="ml-auto rounded-md bg-[var(--td-sla-overdue)]/15 px-1.5 text-[11px] font-semibold tabular-nums text-[var(--td-sla-overdue)]">{stats.overdue}</span>}
              </Link>
              <Link to="/tickets?sla=at_risk" className={item(false)}>
                <Timer className="size-4 text-[var(--td-sla-at-risk)]" strokeWidth={1.8} />At risk
              </Link>
              <Link to="/tickets?priority=Urgent" className={item(false)}>
                <Clock className="size-4 text-[var(--td-urgent)]" strokeWidth={1.8} />Urgent
              </Link>
            </div>
          </div>

          <div>
            <p className="eyebrow px-3 pb-2">Configure</p>
            <Link to="/sla" className={item(path === "/sla")}>{pill(path === "/sla")}<ShieldCheck className="size-4" strokeWidth={1.8} /><span className="relative z-10">SLA policies</span></Link>
          </div>
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">ST</div>
            <div className="leading-tight"><p className="text-[13px] font-medium">Support team</p><p className="text-[11px] text-muted-foreground"><kbd className="font-mono">g</kbd> then <kbd className="font-mono">o t b c r</kbd> to jump</p></div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 md:hidden"><Ticket className="size-4 text-primary" /><span className="text-sm font-semibold">TicketDesk</span></div>
          <h2 className="hidden text-[15px] font-semibold tracking-tight md:block">{title}</h2>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setCommandOpen(true)} className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground md:hidden" aria-label="Search"><Search className="size-4" /></button>
            <Link to="/tickets/new" className="glow-primary inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95"><Plus className="size-4" strokeWidth={2.5} />New ticket<kbd className="ml-1 hidden rounded bg-black/15 px-1 font-mono text-[10px] sm:inline">C</kbd></Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] px-4 py-6 pb-24 sm:px-6 md:px-8 md:py-8 md:pb-10">
          <motion.div key={path} initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <Outlet />
          </motion.div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-sidebar/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur md:hidden">
        {workspace.map((l) => (
          <Link key={l.href} to={l.href} className={cn("flex min-w-14 flex-col items-center gap-0.5 py-1 text-[10px] font-medium", isActive(l.href) ? "text-primary" : "text-muted-foreground")}>
            <l.icon className="size-[18px]" strokeWidth={1.8} />{l.label}
          </Link>
        ))}
      </nav>
      <CommandPalette open={commandOpen} setOpen={setCommandOpen} />
    </div>
  );
}
