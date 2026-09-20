import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function QueueToolbar({ 
  searchInput, 
  onSearchChange, 
  statusFilter, 
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  sortFilter,
  onSortChange,
  stats
}: QueueToolbarProps) {
  
  const TABS = [
    { id: "all", label: "All tickets", count: stats?.all },
    { id: "Open", label: "Open", count: stats?.open },
    { id: "In Progress", label: "In progress", count: stats?.in_progress },
    { id: "Closed", label: "Closed", count: stats?.closed },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--td-surface)] border border-[var(--td-border)] rounded-lg relative w-full overflow-x-auto shadow-sm">
        {TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onStatusChange(tab.id)}
              className={cn(
                "relative z-10 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-md flex items-center gap-2",
                isActive ? "text-[var(--td-text)]" : "text-[var(--td-muted)] hover:text-[var(--td-text)]"
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  "text-xs font-mono px-1.5 py-0.5 rounded-full bg-[var(--td-bg)] border border-[var(--td-border)]",
                  isActive ? "text-[var(--td-text)]" : "text-[var(--td-muted)]"
                )}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="status-tab"
                  className="absolute inset-0 bg-[var(--td-raised)] rounded-md border border-[var(--td-border)] shadow-sm -z-10"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--td-muted)] font-medium">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
          </div>
          
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortFilter} onValueChange={onSortChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority_sla">Most urgent first</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--td-muted)]" />
          <Input
            type="search"
            placeholder="Search by ID, subject, email..."
            className="pl-9 w-full bg-[var(--td-bg)] border-[var(--td-border)] focus-visible:ring-[var(--td-primary)] rounded-lg h-9"
            value={searchInput}
            onChange={onSearchChange}
          />
        </div>
      </div>
    </div>
  );
}
