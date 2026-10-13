"use client";

import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { Button, Input } from "@/components/modules/ui-bits";
import { Pill } from "@/components/modules/discipline/case-detail";
import { SANCTION_TONE, fmtDate, type DisciplineData } from "@/components/modules/discipline/types";

const RANK: Record<string, number> = { counselling: 0, verbal: 1, written: 2, final: 3 };

export function EmployeesTab({ data, openEmployee }: { data: DisciplineData; openEmployee: (key: string) => void }) {
  const [q, setQ] = useState("");
  const people = useMemo(() => {
    const m = new Map<string, { key: string; name: string; number: string | null; dept: string | null; cases: number; last: string; top: { sanction: string; label: string; until: string | null } | null }>();
    for (const c of data.cases) {
      const p = m.get(c.employeeKey) ?? { key: c.employeeKey, name: c.employeeName, number: c.employeeNumber, dept: c.department, cases: 0, last: c.incidentAt, top: null };
      p.cases++;
      if (c.incidentAt > p.last) p.last = c.incidentAt;
      if (c.activeWarning && (!p.top || (RANK[c.sanction] ?? 0) > (RANK[p.top.sanction] ?? 0))) {
        p.top = { sanction: c.sanction, label: c.sanctionLabel, until: c.validUntil };
      }
      m.set(c.employeeKey, p);
    }
    const term = q.trim().toLowerCase();
    return [...m.values()]
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.number?.toLowerCase().includes(term))
      .sort((a, b) => (RANK[b.top?.sanction ?? ""] ?? -1) - (RANK[a.top?.sanction ?? ""] ?? -1) || a.name.localeCompare(b.name));
  }, [data.cases, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search employees" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {people.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No employees with disciplinary records.</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="p-2">Employee</th><th className="p-2">Cases</th><th className="p-2">Current active warning</th><th className="p-2">Last incident</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.key} className="border-t">
                <td className="p-2">
                  <button type="button" className="text-left font-medium hover:underline" onClick={() => openEmployee(p.key)}>{p.name}</button>
                  <p className="text-xs text-muted-foreground">{[p.number && `#${p.number}`, p.dept].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="p-2">{p.cases}</td>
                <td className="p-2">{p.top ? <><Pill tone={SANCTION_TONE[p.top.sanction] ?? "bg-muted"}>{p.top.label}</Pill> <span className="text-xs text-muted-foreground">until {fmtDate(p.top.until)}</span></> : <span className="text-muted-foreground">None</span>}</td>
                <td className="p-2">{fmtDate(p.last)}</td>
                <td className="p-2 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <a href={`/api/modules/discipline/history?employee=${encodeURIComponent(p.key)}`} target="_blank" rel="noreferrer"><FileText className="size-4" />Record PDF</a>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
