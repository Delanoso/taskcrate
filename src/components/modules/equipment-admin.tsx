"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, History, PackageOpen, Users, Wrench } from "lucide-react";
import { jsonFetch } from "@/components/modules/ui-bits";
import { OutTab } from "@/components/modules/equipment/out-tab";
import { IssueTab } from "@/components/modules/equipment/issue-tab";
import { CheckInTab } from "@/components/modules/equipment/checkin-tab";
import { RegisterTab } from "@/components/modules/equipment/register-tab";
import { PeopleTab } from "@/components/modules/equipment/people-tab";
import { RepairsTab, ReturnsTab } from "@/components/modules/equipment/returns-tab";
import { isOpen, type EquipData } from "@/components/modules/equipment/types";

const ALL = {
  out: { label: "Out now", icon: PackageOpen },
  issue: { label: "Issue", icon: ArrowUpFromLine },
  checkin: { label: "Check in", icon: ArrowDownToLine },
  repairs: { label: "Repairs", icon: Wrench },
  returns: { label: "Returns", icon: History },
  register: { label: "Register", icon: Boxes },
  people: { label: "People", icon: Users },
} as const;
type Tab = keyof typeof ALL;

const ORDER: Record<"issuer" | "handback", Tab[]> = {
  issuer: ["out", "issue", "checkin", "register", "people"],
  handback: ["checkin", "repairs", "returns", "out", "register", "people"],
};

export function EquipmentWorkspace({ mode }: { mode: "issuer" | "handback" }) {
  const [data, setData] = useState<EquipData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(ORDER[mode][0]);
  const [checkInFor, setCheckInFor] = useState<string | null>(null);
  const [issueTo, setIssueTo] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      jsonFetch<EquipData>("/api/modules/equipment")
        .then((d) => {
          setData(d);
          return d;
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Could not load");
          return null;
        }),
    [],
  );

  useEffect(() => {
    reload().then((d) => {
      if (d && mode === "issuer" && !d.items.length) setTab("register");
    });
  }, [reload, mode]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading equipment…</p>;

  const open = data.issues.filter(isOpen);
  const badge: Partial<Record<Tab, number>> = {
    out: open.filter((x) => x.overdue || x.status === "awaiting_signature").length,
    checkin: mode === "handback" ? open.filter((x) => x.overdue).length : 0,
    repairs: data.items.filter((i) => i.status === "repair").length,
  };
  const go = {
    checkIn: (person: string) => { setCheckInFor(person); setTab("checkin"); },
    issue: (person: string | null) => { setIssueTo(person); setTab("issue"); },
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b">
        {ORDER[mode].map((key) => {
          const { label, icon: Icon } = ALL[key];
          return (
            <button key={key} type="button" onClick={() => { setTab(key); setCheckInFor(null); setIssueTo(null); }}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="size-4" />
              {label}
              {!!badge[key] && <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{badge[key]}</span>}
            </button>
          );
        })}
      </div>
      {tab === "out" && <OutTab data={data} reload={reload} go={go} />}
      {tab === "issue" && <IssueTab key={issueTo ?? "new"} data={data} reload={reload} initialPerson={issueTo} />}
      {tab === "checkin" && <CheckInTab key={checkInFor ?? "pick"} data={data} reload={reload} initialPerson={checkInFor} />}
      {tab === "repairs" && <RepairsTab data={data} reload={reload} />}
      {tab === "returns" && <ReturnsTab data={data} reload={reload} go={go} />}
      {tab === "register" && <RegisterTab data={data} reload={reload} go={go} />}
      {tab === "people" && <PeopleTab data={data} reload={reload} go={go} />}
    </div>
  );
}