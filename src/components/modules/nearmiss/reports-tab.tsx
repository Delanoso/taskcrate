"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Plus, Search } from "lucide-react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { ReportForm, type ReportPayload } from "@/components/modules/nearmiss/report-form";
import { ReportDetail, SeverityPill, StatusPill } from "@/components/modules/nearmiss/report-detail";
import { fmtDate, type NearMissData, type Report } from "@/components/modules/nearmiss/types";
import { REPORT_TYPES, severityLabel, statusLabel, typeLabel } from "@/lib/modules/nearmiss-options";

const FILTERS = [
  { key: "active", label: "Open" },
  { key: "open", label: "New" },
  { key: "triaged", label: "In progress" },
  { key: "overdue", label: "Overdue" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

const keyOf = (d: Date) => d.toLocaleDateString("en-CA");

export function ReportsTab({ data, setData }: { data: NearMissData; setData: (d: NearMissData) => void }) {
  const [filter, setFilter] = useState<Filter>("active");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [range, setRange] = useState(() => {
    const now = new Date();
    return { from: keyOf(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: keyOf(now) };
  });

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { active: 0, open: 0, triaged: 0, overdue: 0, closed: 0, all: data.reports.length };
    for (const r of data.reports) {
      if (r.status !== "closed") c.active++;
      if (r.overdue) c.overdue++;
      c[r.status as "open" | "triaged" | "closed"]++;
    }
    return c;
  }, [data.reports]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.reports.filter((r) => {
      if (filter === "active" && r.status === "closed") return false;
      if (filter === "overdue" && !r.overdue) return false;
      if ((filter === "open" || filter === "triaged" || filter === "closed") && r.status !== filter) return false;
      if (type && r.reportType !== type) return false;
      if (!term) return true;
      return [r.reference, r.description, r.locationHint, r.category, r.assignedTo, r.reporterName].some((v) => v?.toLowerCase().includes(term));
    });
  }, [data.reports, filter, type, q]);

  const current = data.reports.find((r) => r.id === selected) ?? null;

  const replace = (r: Report) => setData({ ...data, reports: data.reports.map((x) => (x.id === r.id ? r : x)) });
  const removed = (id: string) => {
    setSelected(null);
    setData({ ...data, reports: data.reports.filter((x) => x.id !== id) });
  };

  async function logReport(payload: ReportPayload) {
    const d = await jsonFetch<{ report: Report }>("/api/modules/nearmiss", { method: "POST", body: JSON.stringify(payload) });
    setData({ ...data, reports: [d.report, ...data.reports] });
    setLogging(false);
    setFilter("active");
    setSelected(d.report.id);
  }

  function exportCsv() {
    const head = ["Reference", "Reported", "Event date", "Type", "Category", "Location", "Description", "Potential severity", "Risk rating", "Status", "Responsible", "Corrective action", "Due", "Closed", "Closed by", "Close-out", "Reporter"];
    const lines = rows.map((r) => [
      r.reference, fmtDate(r.createdAt), r.occurredAt ? fmtDate(r.occurredAt) : "", typeLabel(r.reportType), r.category ?? "", r.locationHint ?? "",
      r.description, severityLabel(r.potentialSeverity), severityLabel(r.riskRating), r.overdue ? "Overdue" : statusLabel(r.status), r.assignedTo ?? "",
      r.correctiveAction ?? "", r.dueDate ?? "", r.closedAt ? fmtDate(r.closedAt) : "", r.closedBy ?? "", r.closeOutNote ?? "", r.reporterName ?? "Anonymous",
    ]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    a.download = `near-miss-register-${keyOf(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"} ${
              f.key === "overdue" && counts.overdue > 0 && filter !== f.key ? "border-red-300 text-red-700 dark:text-red-400" : ""
            }`}
          >
            {f.label} <span className="opacity-70">{counts[f.key]}</span>
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => { setLogging((v) => !v); setSelected(null); }}><Plus className="size-4" />Log a report</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search reference, description, location, person…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {REPORT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <Button size="sm" variant="outline" className="h-9" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" />CSV</Button>
      </div>

      {logging && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-semibold">Log a report for someone</h3>
          <ReportForm locations={data.locations} anonymous={false} submitLabel="Save report" onSubmit={logReport} />
        </div>
      )}

      <div className={`grid gap-4 ${current ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : ""}`}>
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {data.reports.length === 0 ? "No reports yet. Print the QR poster on the Board tab and put it up where people work." : "No reports match this filter."}
            </p>
          )}
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setSelected(r.id); setLogging(false); }}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${selected === r.id ? "border-primary bg-primary/5" : "bg-card"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.reference} · {typeLabel(r.reportType)}</span>
                <span className="flex gap-1"><SeverityPill value={r.riskRating ?? r.potentialSeverity} /><StatusPill report={r} /></span>
              </div>
              <p className="mt-1 line-clamp-2 text-muted-foreground">{r.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDate(r.createdAt)}{r.locationHint ? ` · ${r.locationHint}` : ""}{r.assignedTo ? ` · ${r.assignedTo}` : ""}
                {r.dueDate && r.status !== "closed" ? ` · due ${fmtDate(r.dueDate)}` : ""}
                {r.photos.length ? ` · ${r.photos.length} photo${r.photos.length > 1 ? "s" : ""}` : ""}
              </p>
            </button>
          ))}
        </div>
        {current && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <ReportDetail
              key={current.id}
              report={current}
              company={data.company}
              canManage={data.canManage}
              onChange={replace}
              onDeleted={removed}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="mr-2"><p className="font-medium">Register PDF</p><p className="text-xs text-muted-foreground">Every report in the period plus trend summary.</p></div>
        <label className="space-y-1"><span className="block text-xs text-muted-foreground">From</span><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label className="space-y-1"><span className="block text-xs text-muted-foreground">To</span><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        <Button asChild size="sm" variant="outline" className="h-9">
          <a href={`/api/modules/nearmiss/register?from=${range.from}&to=${range.to}`} target="_blank" rel="noreferrer"><FileText className="size-4" />Download</a>
        </Button>
      </div>
    </div>
  );
}
