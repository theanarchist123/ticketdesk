import { useId, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* Chart primitives. Hand-rolled SVG/HTML so there is no extra dependency.
 * Rules followed: thin marks, 2px lines, rounded data-ends, recessive grid,
 * labels in text tokens (never the series colour), hover tooltip on every plot. */

type Pt = { label: string; value: number };

const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / 2) * p * 2 > v * 1.6 ? Math.ceil(v / (p / 2)) * (p / 2) : Math.ceil(v / p) * p;
};

function Tip({ x, y, title, value, color }: { x: number; y: number; title: string; value: string; color?: string }) {
  return (
    <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-xl" style={{ left: `${x}%`, top: y }}>
      <p className="text-muted-foreground">{title}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-semibold tabular-nums">{color && <span className="size-2 rounded-full" style={{ background: color }} />}{value}</p>
    </div>
  );
}

/* ── Delta badge ─────────────────────────────────────────────────────────── */
export function Delta({ value, goodWhen = "up", suffix = "vs prev." }: { value: number | null; goodWhen?: "up" | "down"; suffix?: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">new</span>;
  const up = value > 0, flat = value === 0;
  const good = flat ? null : (up ? goodWhen === "up" : goodWhen === "down");
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums", good === null ? "bg-white/5 text-muted-foreground" : good ? "bg-[var(--td-status-closed)]/15 text-[var(--td-status-closed)]" : "bg-[var(--td-urgent)]/15 text-[var(--td-urgent)]")}>
        <Icon className="size-3" />{Math.abs(value)}%
      </span>
      <span className="text-muted-foreground">{suffix}</span>
    </span>
  );
}

/* ── Sparkline ───────────────────────────────────────────────────────────── */
export function Sparkline({ data: raw, color = "var(--primary)", height = 36, className }: { data: number[]; color?: string; height?: number; className?: string }) {
  const id = useId();
  const data = raw.length > 1 ? raw : [0, 0]; // empty/short data would produce an invalid SVG path
  const W = 120, max = Math.max(1, ...data), min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * W, height - 4 - ((v - min) / (max - min || 1)) * (height - 10)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={cn("w-full overflow-visible", className)} style={{ height }} preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} stroke="var(--card)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/* ── Area / line chart ───────────────────────────────────────────────────── */
export function AreaChart({ data, color = "var(--primary)", height = 200, unit = "tickets" }: { data: Pt[]; color?: string; height?: number; unit?: string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, pl = 28, pr = 8, pt = 10, pb = 22;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const x = (i: number) => pl + (i / Math.max(1, data.length - 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  const line = useMemo(() => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" "), [data, max]); // eslint-disable-line
  const ticks = [0, max / 2, max];
  const labelIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  if (data.length < 2) return <div className="grid place-items-center text-sm text-muted-foreground" style={{ height }}>No data to chart yet</div>;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Trend chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - pl) / (W - pl - pr)) * (data.length - 1)))));
        }}>
        <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.3" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" strokeDasharray={t ? "3 4" : undefined} />
            <text x={pl - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{Math.round(t)}</text>
          </g>
        ))}
        <path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {labelIdx.map((i) => data[i] && <text key={i} x={x(i)} y={H - 5} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--muted-foreground)">{data[i].label}</text>)}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pt} y2={y(0)} stroke="var(--muted-foreground)" strokeOpacity="0.5" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="4.5" fill={color} stroke="var(--card)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && <Tip x={(x(hover) / W) * 100} y={(y(data[hover].value) / H) * height - 12} title={data[hover].label} value={`${data[hover].value} ${unit}`} color={color} />}
    </div>
  );
}

/* ── Vertical bars ───────────────────────────────────────────────────────── */
export function BarChart({ data, color = "var(--primary)", height = 160, unit = "tickets", highlightMax = true }: { data: Pt[]; color?: string; height?: number; unit?: string; highlightMax?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = data.findIndex((d) => d.value === max);
  if (!data.length) return <div className="grid place-items-center text-sm text-muted-foreground" style={{ height }}>No data to chart yet</div>;
  return (
    <div className="relative" style={{ height }}>
      <div className="flex h-[calc(100%-18px)] items-end gap-1.5 border-b border-border">
        {data.map((d, i) => (
          <div key={d.label} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="w-full rounded-t-[4px] transition-all duration-200" style={{ height: `${Math.max(d.value ? 4 : 1, (d.value / max) * 100)}%`, background: color, opacity: hover === i || (hover === null && highlightMax && i === top) ? 1 : d.value ? 0.55 : 0.2 }} />
            {hover === i && <Tip x={50} y={-4} title={d.label} value={`${d.value} ${unit}`} color={color} />}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">{data.map((d) => <span key={d.label} className="flex-1 truncate text-center text-[10px] text-muted-foreground">{d.label}</span>)}</div>
    </div>
  );
}

/* ── Donut ───────────────────────────────────────────────────────────────── */
export interface Seg { label: string; value: number; color: string }

export function Donut({ segments, center, caption }: { segments: Seg[]; center?: string | number; caption?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((n, s) => n + s.value, 0);
  const R = 46, C = 2 * Math.PI * R, gap = total && segments.filter((s) => s.value).length > 1 ? 3 : 0;
  let acc = 0;
  const active = hover !== null ? segments[hover] : null;
  return (
    <div className="@container w-full min-w-0">
    <div className="flex min-w-0 flex-col items-center gap-5 @md:flex-row">
      <div className="relative shrink-0">
        <svg width="148" height="148" viewBox="0 0 120 120" className="-rotate-90" role="img" aria-label="Distribution">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--muted)" strokeWidth="12" />
          {total > 0 && segments.map((s, i) => {
            const len = (s.value / total) * C;
            const el = <circle key={s.label} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth={hover === i ? 14 : 12} strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-acc} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer transition-all duration-200" opacity={hover === null || hover === i ? 1 : 0.35} />;
            acc += len;
            return s.value ? el : null;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="stat text-2xl leading-none">{active ? active.value : center ?? total}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{active ? active.label : caption ?? "total"}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-[13px]">
        {segments.map((s, i) => (
          <li key={s.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={cn("flex min-w-0 items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors", hover === i && "bg-white/5")}>
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums">{s.value}</span>
            <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}

/* ── Horizontal bar list ─────────────────────────────────────────────────── */
export function HBars({ data, color = "var(--primary)", max, format }: { data: (Pt & { sub?: string; color?: string })[]; color?: string; max?: number; format?: (v: number) => string }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{d.label}{d.sub && <span className="ml-2 text-xs text-muted-foreground">{d.sub}</span>}</span>
            <span className="font-medium tabular-nums">{format ? format(d.value) : d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / m) * 100}%`, background: d.color ?? color }} /></div>
        </li>
      ))}
    </ul>
  );
}

/* ── Heatmap (weekday x hour) ────────────────────────────────────────────── */
export function Heatmap({ grid, rows, todayRow }: { grid: number[][]; rows: string[]; todayRow?: number }) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(1, ...grid.flat());
  const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
  return (
    <div className="relative">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))" }}>
        {grid.map((row, r) => (
          <div key={r} className="contents">
            <span className={cn("self-center text-[10px]", r === todayRow ? "font-semibold text-primary" : "text-muted-foreground")}>{rows[r]}{r === todayRow && <span className="block text-[8px] uppercase tracking-wide">today</span>}</span>
            {row.map((v, c) => (
              <div key={c} onMouseEnter={() => setHover({ r, c })} onMouseLeave={() => setHover(null)} className={cn("aspect-square rounded-[3px] transition-transform hover:scale-125 hover:ring-1 hover:ring-foreground/40", r === todayRow && !v && "ring-1 ring-primary/25", r === todayRow && !!v && "ring-2 ring-primary")}
                style={{ background: v ? `color-mix(in oklch, var(--primary) ${Math.round(45 + (v / max) * 55)}%, var(--card))` : "var(--muted)", opacity: v ? 1 : 0.5 }} />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[9px] text-muted-foreground">{h % 3 === 0 ? fmtHour(h) : ""}</span>)}
      </div>
      <div className="mt-3 flex min-h-5 items-center justify-between text-xs text-muted-foreground">
        <span>{hover ? <><span className="font-medium text-foreground">{grid[hover.r][hover.c]} tickets</span> · {rows[hover.r]} {fmtHour(hover.c)}</> : "Hover a cell for details"}</span>
        <span className="flex items-center gap-1.5">Less<span className="flex gap-0.5">{[0.45, 0.65, 0.85, 1].map((o) => <span key={o} className="size-2.5 rounded-[2px]" style={{ background: `color-mix(in oklch, var(--primary) ${Math.round(o * 100)}%, var(--card))` }} />)}</span>More</span>
      </div>
    </div>
  );
}

/* ── Stat tile with optional sparkline ───────────────────────────────────── */
export function StatTile({ label, value, hint, spark, color = "var(--primary)", delta, goodWhen, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; spark?: number[]; color?: string; delta?: number | null; goodWhen?: "up" | "down"; className?: string }) {
  return (
    <div className={cn("card-surface relative overflow-hidden p-5", className)}>
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <p className="eyebrow">{label}</p>
      <p className="stat mt-3 text-4xl leading-none" style={{ color }}>{value}</p>
      <div className="mt-3 flex min-h-5 items-center justify-between gap-2 text-xs text-muted-foreground">{delta !== undefined ? <Delta value={delta} goodWhen={goodWhen} /> : <span>{hint}</span>}</div>
      {spark && <div className="mt-3"><Sparkline data={spark} color={color} /></div>}
    </div>
  );
}

export function ChartCard({ title, subtitle, right, children, className }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card-surface p-5", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}


export function AnalyticsError() {
  return (
    <div role="alert" className="rounded-xl border border-[var(--td-urgent)]/30 bg-[var(--td-urgent)]/10 px-4 py-3 text-[13px]">
      <p className="font-semibold text-[var(--td-urgent)]">Couldn't load analytics</p>
      <p className="mt-0.5 text-muted-foreground">The server didn't return <code className="font-mono">/api/analytics</code>. If you recently updated the code, stop and restart the backend (<code className="font-mono">uvicorn app.main:app</code>) so it picks up the new endpoint, then refresh.</p>
    </div>
  );
}
