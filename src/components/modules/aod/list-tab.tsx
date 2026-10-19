"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button, Input } from "@/components/modules/ui-bits";
import { STATUS_LABEL, money } from "@/lib/modules/aod-options";
import { AodDetail } from "@/components/modules/aod/aod-detail";
import { ARREARS_TONE, Pill, STATUS_TONE, fmtDate, type AodData, type AodRow } from "@/components/modules/aod/types";

const FILTERS = [
  { key: "open", label: "Open", match: (r: AodRow) => r.status === "pending" || r.status === "active" },
  { key: "pending", label: "Awaiting signature", match: (r: AodRow) => r.status === "pending" },
  { key: "arrears", label: "Behind", match: (r: AodRow) => r.arrears > 0 },
  { key: "settled", label: "Settled", match: (r: AodRow) => r.status === "settled" },
  { key: "closed", label: "Declined / cancelled", match: (r: AodRow) => r.status === "declined" || r.status === "cancelled" },
  { key: "all", label: "All", match: () => true },
] as const;

export function AodListTab({ data, reload, selected, setSelected }: { data: AodData; reload: () => Promise<unknown>; selected: string | null; setSelected: (id: string | null) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("open");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const t = q.trim().toLowerCase();
    return data.records.filter((r) => f.match(r) && (!t || [r.employeeName, r.employeeNumber, r.reference, r.reasonText].some((v) => v?.toLowerCase().includes(t))));
  }, [data.records, filter, q]);
  const owed = rows.filter((r) => r.status === "active").reduce((a, r) => a + r.balance, 0);
  const current = data.records.find((r) => r.id === selected);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f.label} <span className="opacity-70">{data.records.filter(f.match).length}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, number, AOD, reason…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" className="h-9" asChild><a href="/api/modules/loan/export" target="_blank" rel="noreferrer"><Download className="size-4" />Excel</a></Button>
      </div>
      {owed > 0 && <p className="text-sm text-muted-foreground">Outstanding in this list: <strong className="text-foreground">{money(owed)}</strong></p>}

      <div className={`grid gap-4 ${current ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        <div className="space-y-2">
          {rows.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{data.records.length ? "Nothing in this list." : "No AODs yet. Use New AOD to create one."}</p>}
          {rows.map((r) => (
            <button key={r.id} type="button" onClick={() => setSelected(r.id)} className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${selected === r.id ? "border-primary bg-primary/5" : "bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{r.employeeName}</span>
                <span className="flex gap-1">
                  {r.arrears > 0 && <Pill tone={ARREARS_TONE}>Behind</Pill>}
                  <Pill tone={STATUS_TONE[r.status] ?? "bg-muted"}>{STATUS_LABEL[r.status] ?? r.status}</Pill>
                </span>
              </div>
              <p className="mt-0.5 text-muted-foreground">{r.reasonText} · {money(r.amount)}{r.status === "active" ? ` · balance ${money(r.balance)}` : ""}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.reference} · {fmtDate(r.createdAt)}{r.instalmentAmount ? ` · ${money(r.instalmentAmount)}/month` : " · no plan yet"}</p>
            </button>
          ))}
        </div>
        {current && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <AodDetail key={current.id} record={current} data={data} onChange={reload} onDeleted={async () => { setSelected(null); await reload(); }} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
