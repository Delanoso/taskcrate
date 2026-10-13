"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Inbox, Settings, Users, X } from "lucide-react";
import { Button, jsonFetch } from "@/components/modules/ui-bits";
import { LeavePlanner } from "@/components/modules/leave/planner";
import { LeaveRequests } from "@/components/modules/leave/requests-tab";
import { LeaveEmployees } from "@/components/modules/leave/employees-tab";
import { LeaveSettingsTab } from "@/components/modules/leave/settings-tab";
import type { LeaveData, WaPrompt } from "@/components/modules/leave/types";

const TABS = [
  { key: "planner", label: "Planner", icon: CalendarDays },
  { key: "requests", label: "Requests", icon: Inbox },
  { key: "employees", label: "Employees", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function LeaveAdmin() {
  const [data, setData] = useState<LeaveData | null>(null);
  const [tab, setTab] = useState<Tab>("planner");
  const [wa, setWa] = useState<WaPrompt>(null);

  const reload = useCallback(() => jsonFetch<LeaveData>("/api/modules/leave").then(setData), []);
  useEffect(() => {
    jsonFetch<LeaveData>("/api/modules/leave")
      .then((d) => {
        setData(d);
        if (d.employees.length === 0) setTab("employees");
      })
      .catch(console.error);
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading leave planner…</p>;
  const pending = data.requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
            {key === "requests" && pending > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {wa && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm dark:border-green-900 dark:bg-green-950/40">
          <span>{wa.text}</span>
          <div className="flex items-center gap-2">
            {wa.url && (
              <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
                <a href={wa.url} target="_blank" rel="noreferrer" onClick={() => setWa(null)}>Send on WhatsApp</a>
              </Button>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => setWa(null)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {tab === "planner" && <LeavePlanner data={data} />}
      {tab === "requests" && <LeaveRequests data={data} reload={reload} onWhatsApp={setWa} />}
      {tab === "employees" && <LeaveEmployees data={data} reload={reload} onWhatsApp={setWa} />}
      {tab === "settings" && <LeaveSettingsTab data={data} reload={reload} />}
    </div>
  );
}
