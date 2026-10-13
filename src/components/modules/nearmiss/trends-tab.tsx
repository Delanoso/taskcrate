"use client";

import { useMemo, useState } from "react";
import type { NearMissData } from "@/components/modules/nearmiss/types";
import { SEVERITIES, typeLabel } from "@/lib/modules/nearmiss-options";

const PERIODS = [
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "12 months" },
] as const;

function tally(values: string[]) {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function TrendsTab({ data }: { data: NearMissData }) {
  const [months, setMonths] = useState<number>(6);

  const t = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const rows = data.reports.filter((r) => new Date(r.createdAt) >= start);
    const buckets = Array.from({ length: months }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-ZA", { month: "short" }), reported: 0, closed: 0 };
    });
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const r of rows) {
      const c = new Date(r.createdAt);
      const i = idx.get(`${c.getFullYear()}-${c.getMonth()}`);
      if (i !== undefined) buckets[i].reported++;
    }
    for (const r of data.reports) {
      if (!r.closedAt) continue;
      const c = new Date(r.closedAt);
      const i = idx.get(`${c.getFullYear()}-${c.getMonth()}`);
      if (i !== undefined) buckets[i].closed++;
    }
    const closed = rows.filter((r) => r.closedAt);
    const avgClose = closed.length
      ? closed.reduce((a, r) => a + (new Date(r.closedAt!).getTime() - new Date(r.createdAt).getTime()) / 86_400_000, 0) / closed.length
      : null;
    return {
      rows,
      buckets,
      open: data.reports.filter((r) => r.status !== "closed").length,
      overdue: data.reports.filter((r) => r.overdue).length,
      closedCount: closed.length,
      avgClose,
      anonymousPct: rows.length ? Math.round((rows.filter((r) => !r.reporterName).length / rows.length) * 100) : null,
      byType: tally(rows.map((r) => typeLabel(r.reportType))),
      byCategory: tally(rows.map((r) => r.category ?? "Not categorised")),
      byLocation: tally(rows.map((r) => r.locationHint ?? "Not given")),
      bySeverity: SEVERITIES.map((s) => [s.label, rows.filter((r) => (r.riskRating ?? r.potentialSeverity) === s.key).length] as [string, number]),
    };
  }, [data.reports, months]);

  const max = Math.max(1, ...t.buckets.map((b) => Math.max(b.reported, b.closed)));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.months} type="button" onClick={() => setMonths(p.months)}
            className={`rounded-full border px-3 py-1 text-sm ${months === p.months ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            Last {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Reports in period" value={t.rows.length} />
        <Kpi label="Open now" value={t.open} />
        <Kpi label="Overdue actions" value={t.overdue} alert={t.overdue > 0} />
        <Kpi label="Avg days to close" value={t.avgClose === null ? "-" : t.avgClose.toFixed(1)} />
        <Kpi label="Sent anonymously" value={t.anonymousPct === null ? "-" : `${t.anonymousPct}%`} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">Reported vs closed per month</h3>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-primary" />Reported</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-green-500" />Closed</span>
          </div>
        </div>
        <div className="flex h-44 items-end gap-2">
          {t.buckets.map((b) => (
            <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <Bar value={b.reported} max={max} className="bg-primary" />
                <Bar value={b.closed} max={max} className="bg-green-500" />
              </div>
              <span className="text-xs text-muted-foreground">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Breakdown title="By type" items={t.byType} />
        <Breakdown title="By risk / potential severity" items={t.bySeverity} />
        <Breakdown title="By hazard type" items={t.byCategory} />
        <Breakdown title="Hot spots (by location)" items={t.byLocation} />
      </div>
    </div>
  );
}

function Kpi({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${alert ? "border-red-300 bg-red-50 dark:bg-red-950/30" : "bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${alert ? "text-red-700 dark:text-red-400" : ""}`}>{value}</p>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="flex h-full w-1/2 max-w-6 flex-col justify-end" title={String(value)}>
      {value > 0 && <span className="text-center text-[10px] text-muted-foreground">{value}</span>}
      <div className={`w-full rounded-t ${className}`} style={{ height: `${(value / max) * 85}%`, minHeight: value ? 3 : 0 }} />
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: [string, number][] }) {
  const shown = items.filter(([, n]) => n > 0).slice(0, 8);
  const max = Math.max(1, ...shown.map(([, n]) => n));
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {shown.length === 0 && <p className="text-sm text-muted-foreground">No reports in this period.</p>}
      <div className="space-y-2">
        {shown.map(([k, n]) => (
          <div key={k} className="text-sm">
            <div className="flex justify-between"><span className="truncate">{k}</span><span className="text-muted-foreground">{n}</span></div>
            <div className="mt-0.5 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
