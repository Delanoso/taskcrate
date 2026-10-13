"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { Button, Input } from "@/components/modules/ui-bits";
import { CONDITIONS, ISSUE_STATUS, label, money } from "@/lib/modules/equipment-options";
import { IssueDetail } from "@/components/modules/equipment/issue-detail";
import { ISSUE_TONE, OVERDUE_TONE, Pill, downloadCsv, fmtDate, isOpen, type IssueRow, type TabProps } from "@/components/modules/equipment/types";

const FILTERS = [
  { key: "all", label: "All out", match: (x: IssueRow) => isOpen(x) },
  { key: "unsigned", label: "Awaiting signature", match: (x: IssueRow) => x.status === "awaiting_signature" },
  { key: "overdue", label: "Overdue", match: (x: IssueRow) => x.overdue },
  { key: "due", label: "Due this week", match: (x: IssueRow) => isOpen(x) && !x.overdue && !!x.dueBackAt && new Date(`${x.dueBackAt}T12:00:00`).getTime() - Date.parse(new Date().toISOString().slice(0, 10)) < 7 * 864e5 },
] as const;

export function OutTab({ data, reload, go }: TabProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>(() => (data.issues.some((x) => x.overdue) ? "overdue" : "all"));
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const items = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const term = q.trim().toLowerCase();
    return data.issues
      .filter((x) => f.match(x))
      .filter((x) => {
        const it = items.get(x.itemId);
        return !term || [x.employeeName, x.employeeNumber, x.documentNumber, it?.name, it?.assetTag, it?.serialNumber].some((v) => v?.toLowerCase().includes(term));
      })
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueBackAt ?? "9").localeCompare(b.dueBackAt ?? "9") || b.issuedAt.localeCompare(a.issuedAt));
  }, [data.issues, filter, q, items]);

  const value = rows.reduce((a, x) => a + (items.get(x.itemId)?.value ?? 0), 0);

  function exportCsv() {
    downloadCsv(
      "equipment-out.csv",
      ["Document", "Item", "Asset tag", "Serial", "Value", "Employee", "Employee no.", "Issued", "Condition out", "Due back", "Status", "Signed"],
      rows.map((x) => {
        const it = items.get(x.itemId);
        return [x.documentNumber, it?.name, it?.assetTag, it?.serialNumber, it?.value, x.employeeName, x.employeeNumber, fmtDate(x.issuedAt), label(CONDITIONS, x.conditionOut), x.dueBackAt, x.overdue ? "Overdue" : ISSUE_STATUS[x.status as keyof typeof ISSUE_STATUS], x.signedAt ? fmtDate(x.signedAt, true) : ""];
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f.label} <span className="opacity-70">{data.issues.filter(f.match).length}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search person, item, tag, document…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" className="h-9" disabled={!rows.length} onClick={exportCsv}><Download className="size-4" />CSV</Button>
        {data.modules.issuer && <Button size="sm" className="h-9" onClick={() => go.issue(null)}><Plus className="size-4" />Issue</Button>}
      </div>
      {rows.length > 0 && value > 0 && <p className="text-sm text-muted-foreground">{rows.length} item{rows.length === 1 ? "" : "s"} worth {money(value)} in this list.</p>}

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {data.issues.some(isOpen) ? "Nothing in this list." : "Nothing is signed out right now."}
            </p>
          )}
          {rows.map((x) => {
            const it = items.get(x.itemId);
            return (
              <button key={x.id} type="button" onClick={() => setSelected(x.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${selected === x.id ? "border-primary bg-primary/5" : "bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{it?.name ?? "Item"}{it?.assetTag ? <span className="font-normal text-muted-foreground"> · {it.assetTag}</span> : null}</span>
                  <span className="flex gap-1">
                    {x.overdue && <Pill tone={OVERDUE_TONE}>Overdue</Pill>}
                    <Pill tone={ISSUE_TONE[x.status] ?? "bg-muted"}>{ISSUE_STATUS[x.status as keyof typeof ISSUE_STATUS] ?? x.status}</Pill>
                  </span>
                </div>
                <p className="mt-0.5">{x.employeeName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{x.documentNumber} · out {fmtDate(x.issuedAt)}{x.dueBackAt ? ` · due ${fmtDate(x.dueBackAt)}` : ""}</p>
              </button>
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
