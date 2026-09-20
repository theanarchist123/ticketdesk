import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface QueueToolbarProps {
  searchInput: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

const TABS = [
  { id: "all", label: "All tickets" },
  { id: "Open", label: "Open" },
  { id: "In Progress", label: "In progress" },
  { id: "Closed", label: "Closed" },
];

export function QueueToolbar({ searchInput, onSearchChange, statusFilter, onStatusChange }: QueueToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[var(--td-surface)] p-2 rounded-xl border border-[var(--td-border)] shadow-sm">
      <div className="flex items-center gap-1 p-1 bg-[var(--td-bg)] rounded-lg relative w-full md:w-auto overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onStatusChange(tab.id)}
              className={cn(
                "relative z-10 px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap rounded-md",
                isActive ? "text-[var(--td-text)]" : "text-[var(--td-muted)] hover:text-[var(--td-text)]"
              )}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="status-tab"
                  className="absolute inset-0 bg-[var(--td-raised)] rounded-md border border-[var(--td-border)] -z-10"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="relative w-full md:w-80 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--td-muted)]" />
        <Input
          type="search"
          placeholder="Search by ID, subject, email..."
          className="pl-9 w-full bg-[var(--td-bg)] border-[var(--td-border)] focus-visible:ring-[var(--td-primary)] rounded-lg h-10"
          value={searchInput}
          onChange={onSearchChange}
        />
      </div>
    </div>
  );
}
