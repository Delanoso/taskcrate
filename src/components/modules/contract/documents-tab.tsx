"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button, Input } from "@/components/modules/ui-bits";
import { DocDetail } from "@/components/modules/contract/doc-detail";
import { Pill, STATUS_TONE, fmtDate, selectClass, type ContractData, type ContractDoc } from "@/components/modules/contract/types";
import { STATUS_LABEL } from "@/lib/modules/contract-library";

const FILTERS = [
  { key: "outstanding", label: "Waiting to sign", match: (d: ContractDoc) => d.status === "sent" || d.status === "viewed" },
  { key: "countersign", label: "To countersign", match: (d: ContractDoc) => d.status === "awaiting_countersign" },
  { key: "overdue", label: "Overdue", match: (d: ContractDoc) => d.overdue },
  { key: "completed", label: "Completed", match: (d: ContractDoc) => d.status === "completed" },
  { key: "declined", label: "Declined / voided", match: (d: ContractDoc) => d.status === "declined" || d.status === "voided" },
  { key: "all", label: "All", match: () => true },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export function DocumentsTab({
  data,
  setData,
  selected,
  setSelected,
}: {
  data: ContractData;
  setData: (d: ContractData) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>(() => (data.documents.some((d) => d.status === "awaiting_countersign") ? "countersign" : "all"));
  const [template, setTemplate] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const term = q.trim().toLowerCase();
    return data.documents.filter(
      (d) =>
        f.match(d) &&
        (template === "all" || d.templateId === template || (template === "none" && !d.templateId)) &&
        (!term || [d.employeeName, d.employeeNumber, d.title, d.reference].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [data.documents, filter, template, q]);

  const replace = (d: ContractDoc) => setData({ ...data, documents: data.documents.map((x) => (x.id === d.id ? { ...x, ...d } : x)) });

  function exportCsv() {
    const head = ["Reference", "Document", "Employee", "Employee no.", "Status", "Sent", "Due", "Opened", "Signed", "Signed by", "Countersigned", "Declined reason"];
    const lines = rows.map((d) => [
      d.reference, d.title, d.employeeName, d.employeeNumber ?? "", STATUS_LABEL[d.status] ?? d.status, fmtDate(d.createdAt), d.dueDate ?? "",
      d.viewedAt ? fmtDate(d.viewedAt, true) : "", d.signedAt ? fmtDate(d.signedAt, true) : "", d.signerName ?? "",
      d.countersignedAt ? `${d.countersignName} ${fmtDate(d.countersignedAt)}` : "", d.declineReason ?? "",
    ]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    a.download = "signing-register.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f.label} <span className="opacity-70">{data.documents.filter(f.match).length}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, number, document, reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${selectClass} w-auto`} value={template} onChange={(e) => setTemplate(e.target.value)} aria-label="Template">
          <option value="all">All documents</option>
          {data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option value="none">One-off documents</option>
        </select>
        <Button size="sm" variant="outline" className="h-9" disabled={!rows.length} onClick={exportCsv}><Download className="size-4" />CSV</Button>
      </div>

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {data.documents.length ? "Nothing in this list." : "Nothing sent yet. Use the Send tab to send a contract or policy for signing."}
            </p>
          )}
          {rows.map((d) => (
            <button key={d.id} type="button" onClick={() => setSelected(d.id)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${selected === d.id ? "border-primary bg-primary/5" : "bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{d.employeeName}</span>
                <span className="flex gap-1">
                  {d.overdue && <Pill tone="bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200">Overdue</Pill>}
                  <Pill tone={STATUS_TONE[d.status] ?? "bg-muted"}>{STATUS_LABEL[d.status] ?? d.status}</Pill>
                </span>
              </div>
              <p className="mt-0.5 text-muted-foreground">{d.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {d.reference} · sent {fmtDate(d.createdAt)}
                {d.signedAt ? ` · signed ${fmtDate(d.signedAt)}` : d.dueDate ? ` · due ${fmtDate(d.dueDate)}` : ""}
              </p>
            </button>
          ))}
        </div>
        {selected && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <DocDetail
              key={selected}
              id={selected}
              data={data}
              onChange={replace}
              onCreated={(d) => { setData({ ...data, documents: [d, ...data.documents] }); setFilter("outstanding"); setSelected(d.id); }}
              onDeleted={(id) => { setSelected(null); setData({ ...data, documents: data.documents.filter((x) => x.id !== id) }); }}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
