"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, Plus, Search } from "lucide-react";
import { Button, Input } from "@/components/modules/ui-bits";
import { ISSUE_STATUS, OUTCOMES, label, money } from "@/lib/modules/equipment-options";
import { IssueDetail, Panel } from "@/components/modules/equipment/issue-detail";
import { ISSUE_TONE, OVERDUE_TONE, Pill, fmtDate, isOpen, type IssueRow, type TabProps } from "@/components/modules/equipment/types";

export function PeopleTab({ data, reload, go }: TabProps) {
  const [q, setQ] = useState("");
  const [person, setPerson] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const items = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);

  const people = useMemo(() => {
    const m = new Map<string, { name: string; number: string | null; rows: IssueRow[] }>();
    for (const x of data.issues) {
      if (x.status === "cancelled") continue;
      const k = x.employeeName.trim().toLowerCase();
      const p = m.get(k) ?? { name: x.employeeName, number: x.employeeNumber, rows: [] };
      p.rows.push(x);
      m.set(k, p);
    }
    const term = q.trim().toLowerCase();
    return [...m.values()]
      .map((p) => {
        const out = p.rows.filter(isOpen);
        return { ...p, out, value: out.reduce((a, x) => a + (items.get(x.itemId)?.value ?? 0), 0), overdue: out.filter((x) => x.overdue).length, findings: p.rows.filter((x) => x.outcome && x.outcome !== "stock").length };
      })
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.number?.toLowerCase().includes(term))
      .sort((a, b) => b.out.length - a.out.length || a.name.localeCompare(b.name));
  }, [data.issues, q, items]);

  const current = people.find((p) => p.name === person);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search a person or employee number…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className={`grid gap-4 ${current ? "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" : ""}`}>
        <div className="space-y-2">
          {people.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No one has been issued equipment yet.</p>}
          {people.map((p) => (
            <button key={p.name} type="button" onClick={() => { setPerson(p.name); setIssue(null); }}
              className={`w-full rounded-lg border p-3 text-left text-sm hover:bg-muted/50 ${person === p.name ? "border-primary bg-primary/5" : "bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}{p.number ? <span className="font-normal text-muted-foreground"> · #{p.number}</span> : null}</span>
                {p.overdue > 0 && <Pill tone={OVERDUE_TONE}>{p.overdue} overdue</Pill>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {p.out.length ? `Holds ${p.out.length}${p.value ? ` (${money(p.value)})` : ""}` : "Holds nothing"} · {p.rows.length} issued in total{p.findings ? ` · ${p.findings} with findings` : ""}
              </p>
            </button>
          ))}
        </div>
        {current && (
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            {issue ? (
              <IssueDetail key={issue} id={issue} data={data} reload={reload} go={go} onClose={() => setIssue(null)} />
            ) : (
              <Panel onClose={() => setPerson(null)}>
                <h3 className="pr-8 text-lg font-semibold">{current.name}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.modules.issuer && <Button size="sm" variant="outline" onClick={() => go.issue(current.name)}><Plus className="size-4" />Issue more</Button>}
                  {current.out.length > 0 && <Button size="sm" onClick={() => go.checkIn(current.name)}><ArrowDownToLine className="size-4" />Check in</Button>}
                </div>
                <h4 className="mt-4 border-t pt-3 text-sm font-semibold">History</h4>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {current.rows.map((x) => (
                    <li key={x.id}>
                      <button type="button" className="flex w-full items-center justify-between gap-2 text-left hover:underline" onClick={() => setIssue(x.id)}>
                        <span>
                          {items.get(x.itemId)?.name ?? "Item"}
                          <span className="text-muted-foreground"> · {fmtDate(x.issuedAt)}{x.returnedAt ? ` → ${fmtDate(x.returnedAt)}` : ""}{x.outcome && x.outcome !== "stock" ? ` · ${label(OUTCOMES, x.outcome)}` : ""}</span>
                        </span>
                        <Pill tone={x.overdue ? OVERDUE_TONE : ISSUE_TONE[x.status] ?? "bg-muted"}>{x.overdue ? "Overdue" : ISSUE_STATUS[x.status as keyof typeof ISSUE_STATUS] ?? x.status}</Pill>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
