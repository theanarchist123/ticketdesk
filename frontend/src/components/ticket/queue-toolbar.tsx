import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Stats } from "@/lib/types";

export interface QueueToolbarProps {
  searchInput: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  priorityFilter: string;
  onPriorityChange: (val: string) => void;
  sortFilter: string;
  onSortChange: (val: string) => void;
  stats?: Stats;
}

const selectCls = "h-9 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground outline-none focus:border-primary";

export function QueueToolbar({ searchInput, onSearchChange, statusFilter, onStatusChange, priorityFilter, onPriorityChange, sortFilter, onSortChange, stats }: QueueToolbarProps) {
  const TABS = [
    { id: "all", label: "All", count: stats?.all },
    { id: "Open", label: "Open", count: stats?.open },
    { id: "In Progress", label: "In progress", count: stats?.in_progress },
    { id: "Closed", label: "Closed", count: stats?.closed },
  ];
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-[inset_0_2px_6px_oklch(0_0_0/0.3)] lg:w-auto">
        {TABS.map((tab) => {
          const active = statusFilter === tab.id;
          return (
            <button key={tab.id} onClick={() => onStatusChange(tab.id)} className={cn("relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-95", active ? "text-primary-foreground" : "text-muted-foreground hover:-translate-y-px hover:bg-white/5 hover:text-foreground")}>
              {active && (
                <motion.span
                  layoutId="status-tab"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_6px_18px_-6px_color-mix(in_oklch,var(--primary)_70%,transparent)]"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              {tab.count !== undefined && <span className={cn("relative z-10 text-[11px] tabular-nums", active ? "opacity-80" : "opacity-60")}>{tab.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
        <select value={priorityFilter} onChange={(e) => onPriorityChange(e.target.value)} className={selectCls} aria-label="Priority">
          <option value="all">All priorities</option>
          {["Urgent", "High", "Medium", "Low"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sortFilter} onChange={(e) => onSortChange(e.target.value)} className={selectCls} aria-label="Sort">
          <option value="priority_sla">Most urgent first</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <div className="relative min-w-[220px] flex-1 lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search ID, name, email, text…" value={searchInput} onChange={onSearchChange} className={cn(selectCls, "w-full pl-9 pr-8 placeholder:text-muted-foreground")} />
          {searchInput && <button onClick={() => onSearchChange({ target: { value: "" } } as any)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="size-4" /></button>}
        </div>
      </div>
    </div>
  );
}
