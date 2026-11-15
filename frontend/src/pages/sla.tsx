import { Layout } from "@/components/layout";
import { PriorityMark } from "@/components/ui/priority-mark";
import { SLA_HOURS } from "@/lib/sla";

const BLURB: Record<string, string> = {
  Urgent: "Outages and blockers. Drop everything.",
  High: "Major feature broken for a customer.",
  Medium: "Normal requests and bugs.",
  Low: "Questions and nice-to-haves.",
};

export default function SlaPage() {
  return (
    <Layout>
      <div className="flex max-w-3xl flex-col gap-6">
        <div><h1 className="font-display text-2xl font-semibold">SLA policies</h1><p className="mt-1 text-sm text-muted-foreground">Every ticket gets a response deadline from its priority. Tickets turn amber when under 25% of the window remains and red once the deadline passes.</p></div>
        <section className="card-surface divide-y divide-border overflow-hidden">
          {Object.entries(SLA_HOURS).map(([k, h]) => (
            <div key={k} className="flex items-center gap-4 px-5 py-4">
              <PriorityMark priority={k} />
              <div className="flex-1"><p className="text-sm font-semibold">{k}</p><p className="text-xs text-muted-foreground">{BLURB[k]}</p></div>
              <span className="rounded-lg border border-border px-2.5 py-1 text-sm tabular-nums">{h}h</span>
            </div>
          ))}
        </section>
        <section className="card-surface p-5">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {[["Quick search", "⌘ K"], ["New ticket", "C"], ["Go to overview / tickets / board / customers / reports", "G then O T B C R"]].map(([l, k]) => (
              <li key={l} className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{l}</span><kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd></li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
