"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { CaseForm, type CasePayload } from "@/components/modules/discipline/case-form";
import { CaseDetail, Pill } from "@/components/modules/discipline/case-detail";
import { SANCTION_TONE, STATUS_TONE, fmtDate, type Case, type DisciplineData } from "@/components/modules/discipline/types";
import { statusLabel } from "@/lib/modules/discipline-options";

const FILTERS = [
  { key: "active", label: "In progress" },
  { key: "open", label: "Investigating" },
  { key: "hearing", label: "Hearing" },
  { key: "issued", label: "Awaiting signature" },
  { key: "finalised", label: "Finalised" },
  { key: "withdrawn", label: "Withdrawn" },
  { key: "all", label: "All" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export function CasesTab({
  data,
  setData,
  employeeFilter,
  clearEmployeeFilter,
}: {
  data: DisciplineData;
  setData: (d: DisciplineData) => void;
  employeeFilter: string | null;
  clearEmployeeFilter: () => void;
}) {
  const [filter, setFilter] = useState<Filter>(employeeFilter ? "all" : "active");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f.key, 0])) as Record<Filter, number>;
    for (const x of data.cases) {
      c.all++;
      if (x.status in c) c[x.status as Filter]++;
      if (["open", "hearing", "issued"].includes(x.status)) c.active++;
    }
    return c;
  }, [data.cases]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.cases.filter((c) => {
      if (employeeFilter && c.employeeKey !== employeeFilter) return false;
      if (filter === "active" && !["open", "hearing", "issued"].includes(c.status)) return false;
      if (filter !== "active" && filter !== "all" && c.status !== filter) return false;
      if (!term) return true;
      return [c.reference, c.employeeName, c.employeeNumber, c.offenceLabel, c.offence, c.description].some((v) => v?.toLowerCase().includes(term));
    });
  }, [data.cases, filter, q, employeeFilter]);

  const current = data.cases.find((c) => c.id === selected) ?? null;
  const replace = (c: Case) => setData({ ...data, cases: data.cases.map((x) => (x.id === c.id ? c : x)) });

  async function create(p: CasePayload) {
    const d = await jsonFetch<{ case: Case }>("/api/modules/discipline", { method: "POST", body: JSON.stringify(p) });
    const person = { employeeName: p.employeeName, employeeNumber: p.employeeNumber, employeePhone: p.employeePhone, jobTitle: p.jobTitle, department: p.department };
    const directory = data.directory.some((x) => x.employeeName.toLowerCase() === p.employeeName.toLowerCase()) ? data.directory : [...data.directory, person];
    setData({ ...data, directory, cases: [d.case, ...data.cases] });
    setCreating(false);
    setFilter("active");
    setSelected(d.case.id);
  }

  function exportCsv() {
    const head = ["Reference", "Employee", "Employee no.", "Department", "Incident", "Offence", "Status", "Sanction", "Issued", "Valid until", "Active", "Signed", "Appeal"];
    const lines = rows.map((c) => [
      c.reference, c.employeeName, c.employeeNumber ?? "", c.department ?? "", fmtDate(c.incidentAt, true), c.offenceLabel, statusLabel(c.status),
      c.sanctionLabel, c.sanctionDate ?? "", c.validUntil ?? "", c.activeWarning ? "Yes" : "No",
      c.refusedToSign ? `Refused (witness ${c.witnessName})` : c.employeeSignedAt ? fmtDate(c.employeeSignedAt) : "", c.appealOutcome ?? (c.appealLodgedAt ? "Pending" : ""),
    ]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    a.download = "discipline-register.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const person = employeeFilter ? data.cases.find((c) => c.employeeKey === employeeFilter) : null;

  return (
    <div className="space-y-4">
      {person && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span>Showing cases for <strong>{person.employeeName}</strong></span>
          <button type="button" className="text-primary underline" onClick={clearEmployeeFilter}>Show everyone</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f.label} <span className="opacity-70">{counts[f.key]}</span>
          </button>
        ))}
        <Button size="sm" className="ml-auto" onClick={() => { setCreating((v) => !v); setSelected(null); }}><Plus className="size-4" />New case</Button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, number, offence, reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" className="h-9" disabled={!rows.length} onClick={exportCsv}><Download className="size-4" />CSV</Button>
      </div>

      {creating && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-semibold">New disciplinary case</h3>
          <CaseForm directory={data.directory} submitLabel="Open case" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      <div className={`grid gap-4 ${current ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : ""}`}>
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {data.cases.length ? "No cases match this filter." : "No disciplinary cases yet. Click New case to open one."}
            </p>
          )}
          {rows.map((c) => (
            <button key={c.id} type="button" onClick={() => { setSelected(c.id); setCreating(false); }}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${selected === c.id ? "border-primary bg-primary/5" : "bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.employeeName}</span>
                <span className="flex gap-1">
                  {c.sanction !== "pending" && <Pill tone={SANCTION_TONE[c.sanction] ?? "bg-muted"}>{c.sanctionLabel}</Pill>}
                  <Pill tone={STATUS_TONE[c.status] ?? "bg-muted"}>{statusLabel(c.status)}</Pill>
                </span>
              </div>
              <p className="mt-0.5 text-muted-foreground">{c.offenceLabel}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.reference} · {fmtDate(c.incidentAt)}
                {c.status === "hearing" && c.hearingAt ? ` · hearing ${fmtDate(c.hearingAt, true)}` : ""}
                {c.activeWarning ? ` · active until ${fmtDate(c.validUntil)}` : ""}
              </p>
            </button>
          ))}
        </div>
        {current && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <CaseDetail
              key={current.id}
              c={current}
              data={data}
              onChange={replace}
              onDeleted={(id) => { setSelected(null); setData({ ...data, cases: data.cases.filter((x) => x.id !== id) }); }}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
