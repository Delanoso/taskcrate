"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, FilePlus2, ListChecks, Wallet } from "lucide-react";
import { jsonFetch } from "@/components/modules/ui-bits";
import { AodListTab } from "@/components/modules/aod/list-tab";
import { AodForm } from "@/components/modules/aod/aod-form";
import { PayrollTab } from "@/components/modules/aod/payroll-tab";
import { ReasonsTab } from "@/components/modules/aod/reasons-tab";
import type { AodData } from "@/components/modules/aod/types";

const TABS = [
  { key: "list", label: "AODs", icon: BookOpen },
  { key: "new", label: "New AOD", icon: FilePlus2 },
  { key: "payroll", label: "Salary deductions", icon: Wallet },
  { key: "reasons", label: "Reasons", icon: ListChecks },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function LoanAdmin() {
  const [data, setData] = useState<AodData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("list");
  const [selected, setSelected] = useState<string | null>(null);

  const reload = useCallback(
    () => jsonFetch<AodData>("/api/modules/loan").then((d) => { setData(d); return d; }).catch((e) => { setError(e instanceof Error ? e.message : "Could not load"); return null; }),
    [],
  );
  useEffect(() => {
    reload().then((d) => d && !d.records.length && setTab("new"));
  }, [reload]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading the AOD Book…</p>;
  const waiting = data.records.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="size-4" />{label}
            {key === "list" && waiting > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white" title="Waiting for a signature">{waiting}</span>}
          </button>
        ))}
      </div>
      {tab === "list" && <AodListTab data={data} reload={reload} selected={selected} setSelected={setSelected} />}
      {tab === "new" && <AodForm data={data} onCreated={async (id) => { await reload(); setSelected(id); setTab("list"); }} />}
      {tab === "payroll" && <PayrollTab data={data} reload={reload} />}
      {tab === "reasons" && <ReasonsTab data={data} reload={reload} />}
    </div>
  );
}
