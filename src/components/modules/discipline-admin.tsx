"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Settings, Users } from "lucide-react";
import { jsonFetch } from "@/components/modules/ui-bits";
import { CasesTab } from "@/components/modules/discipline/cases-tab";
import { EmployeesTab } from "@/components/modules/discipline/employees-tab";
import { SettingsTab } from "@/components/modules/discipline/settings-tab";
import type { DisciplineData } from "@/components/modules/discipline/types";

const TABS = [
  { key: "cases", label: "Cases", icon: FolderOpen },
  { key: "employees", label: "Employees", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function DisciplineAdmin() {
  const [data, setData] = useState<DisciplineData | null>(null);
  const [tab, setTab] = useState<Tab>("cases");
  const [employee, setEmployee] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    jsonFetch<DisciplineData>("/api/modules/discipline")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading cases…</p>;
  const pending = data.cases.filter((c) => c.status === "issued").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => { setTab(key); if (key === "cases") setEmployee(null); }}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="size-4" />
            {label}
            {key === "cases" && pending > 0 && <span className="rounded-full bg-blue-500 px-1.5 text-xs text-white" title="Awaiting signature">{pending}</span>}
          </button>
        ))}
      </div>
      {tab === "cases" && (
        <CasesTab key={employee ?? "all"} data={data} setData={setData} employeeFilter={employee} clearEmployeeFilter={() => setEmployee(null)} />
      )}
      {tab === "employees" && <EmployeesTab data={data} openEmployee={(k) => { setEmployee(k); setTab("cases"); }} />}
      {tab === "settings" && <SettingsTab data={data} setData={setData} />}
    </div>
  );
}
