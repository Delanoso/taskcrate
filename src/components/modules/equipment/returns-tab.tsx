"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { CONDITIONS, OUTCOMES, label, money } from "@/lib/modules/equipment-options";
import { IssueDetail } from "@/components/modules/equipment/issue-detail";
import { OVERDUE_TONE, Pill, downloadCsv, fmtDate, parseMoney, type EquipData, type IssueRow, type TabProps } from "@/components/modules/equipment/types";

const damaged = (x: IssueRow) => x.outcome !== "stock" || x.conditionIn === "damaged" || x.conditionIn === "poor" || Object.values(x.checklist).some((v) => v === false);

export function ReturnsTab({ data, reload, go }: TabProps) {
  const [filter, setFilter] = useState<"all" | "damage" | "lost">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const items = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);

  const groups = useMemo(() => {
    const m = new Map<string, IssueRow[]>();
    for (const x of data.issues) {
      if (!x.returnBatchId || x.status === "cancelled") continue;
      m.set(x.returnBatchId, [...(m.get(x.returnBatchId) ?? []), x]);
    }
    const term = q.trim().toLowerCase();
    return [...m.values()]
      .filter((g) => filter === "all" || (filter === "lost" ? g.some((x) => x.outcome === "lost") : g.some(damaged)))
      .filter((g) => !term || g.some((x) => [x.employeeName, x.handbackNumber, x.documentNumber, items.get(x.itemId)?.name, items.get(x.itemId)?.assetTag].some((v) => v?.toLowerCase().includes(term))))
      .sort((a, b) => (b[0].returnedAt ?? "").localeCompare(a[0].returnedAt ?? ""));
  }, [data.issues, filter, q, items]);

  function exportCsv() {
    downloadCsv(
      "equipment-returns.csv",
      ["Handback", "Returned", "Employee", "Item", "Asset tag", "Condition out", "Condition in", "Outcome", "Cost", "Deductible", "Notes", "Inspected by"],
      groups.flat().map((x) => {
        const it = items.get(x.itemId);
        return [x.handbackNumber, x.returnedAt ? fmtDate(x.returnedAt) : "", x.employeeName, it?.name, it?.assetTag, label(CONDITIONS, x.conditionOut), x.conditionIn ? label(CONDITIONS, x.conditionIn) : "", label(OUTCOMES, x.outcome), x.repairCost ?? "", x.deductibleId ? "Yes" : "", x.damageNotes, x.receivedBy];
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "damage", "lost"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f === "all" ? "All returns" : f === "damage" ? "With damage or findings" : "Lost / not returned"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search person, item, handback number…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" className="h-9" disabled={!groups.length} onClick={exportCsv}><Download className="size-4" />CSV</Button>
      </div>
      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        <div className="space-y-2">
          {groups.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No returns in this list yet.</p>}
          {groups.map((g) => {
            const first = g[0];
            const cost = g.reduce((a, x) => a + (x.repairCost ?? 0), 0);
            return (
              <div key={first.returnBatchId} className={`rounded-lg border p-3 text-sm ${g.some((x) => x.id === selected) ? "border-primary bg-primary/5" : "bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{first.employeeName}</span>
                  <span className="flex gap-1">
                    {g.some((x) => x.outcome === "lost") && <Pill tone={OVERDUE_TONE}>Lost</Pill>}
                    {g.some(damaged) && !g.some((x) => x.outcome === "lost") && <Pill tone="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Findings</Pill>}
                    {g.some((x) => x.deductibleId) && <Pill tone="bg-muted text-muted-foreground">Deductible</Pill>}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{first.handbackNumber} · {first.returnedAt ? fmtDate(first.returnedAt, true) : ""} · by {first.receivedBy}{cost ? ` · ${money(cost)}` : ""}</p>
                <ul className="mt-2 space-y-0.5">
                  {g.map((x) => (
                    <li key={x.id}>
                      <button type="button" className="text-left hover:underline" onClick={() => setSelected(x.id)}>
                        {items.get(x.itemId)?.name ?? "Item"} <span className="text-muted-foreground">· {label(OUTCOMES, x.outcome)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={`/api/modules/equipment/issues/${first.id}/pdf?type=handback`} target="_blank" rel="noreferrer"><Download className="size-3" />Handback report</a>
              </div>
            );
          })}
        </div>
        {selected && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <IssueDetail key={selected} id={selected} data={data} reload={reload} go={go} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

export function RepairsTab({ data, reload }: { data: EquipData; reload: () => Promise<unknown> }) {
  const inRepair = data.items.filter((i) => i.status === "repair");
  if (!inRepair.length) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing is in repair. Items checked in with the outcome &quot;Send for repair&quot; appear here.</p>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {inRepair.map((i) => {
        const last = data.issues.find((x) => x.itemId === i.id && x.outcome === "repair");
        return <RepairCard key={i.id} item={i} last={last} canManage={data.canManage} reload={reload} />;
      })}
    </div>
  );
}

function RepairCard({ item, last, canManage, reload }: { item: EquipData["items"][number]; last: IssueRow | undefined; canManage: boolean; reload: () => Promise<unknown> }) {
  const [condition, setCondition] = useState("good");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function done(retire: boolean) {
    setBusy(true);
    setError(null);
    try {
      await jsonFetch(`/api/modules/equipment/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ action: "repair_done", condition, cost: cost ? parseMoney(cost) : null, note: note || undefined, retire }) });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <p className="font-medium">{item.name}<span className="font-normal text-muted-foreground">{item.assetTag ? ` · ${item.assetTag}` : ""}</span></p>
        {last && <p className="text-xs text-muted-foreground">From {last.employeeName} on {fmtDate(last.returnedAt)} ({last.handbackNumber}){last.damageNotes ? `: ${last.damageNotes}` : ""}</p>}
        {last?.repairCost != null && <p className="text-xs text-muted-foreground">Estimated {money(last.repairCost)}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={condition} onChange={(e) => setCondition(e.target.value)} aria-label="Condition after repair">
          {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <Input className="w-32" inputMode="decimal" placeholder="Actual cost R" value={cost} onChange={(e) => setCost(e.target.value)} />
        <Input className="min-w-40 flex-1" placeholder="Repair note / supplier" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => done(false)}>Back in store</Button>
        {canManage && <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => confirm(`Write off ${item.name}?`) && done(true)}>Write off</Button>}
      </div>
    </div>
  );
}
