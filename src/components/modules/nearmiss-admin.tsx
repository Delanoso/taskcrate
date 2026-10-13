"use client";

import { useEffect, useState } from "react";
import { BarChart3, ClipboardList, QrCode } from "lucide-react";
import { jsonFetch } from "@/components/modules/ui-bits";
import { ReportsTab } from "@/components/modules/nearmiss/reports-tab";
import { TrendsTab } from "@/components/modules/nearmiss/trends-tab";
import { BoardTab } from "@/components/modules/nearmiss/board-tab";
import type { NearMissData } from "@/components/modules/nearmiss/types";

const TABS = [
  { key: "reports", label: "Reports", icon: ClipboardList },
  { key: "trends", label: "Trends", icon: BarChart3 },
  { key: "board", label: "QR board & areas", icon: QrCode },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function NearMissAdmin() {
  const [data, setData] = useState<NearMissData | null>(null);
  const [tab, setTab] = useState<Tab>("reports");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    jsonFetch<NearMissData>("/api/modules/nearmiss")
      .then((d) => {
        setData(d);
        if (d.reports.length === 0) setTab("board");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading reports…</p>;
  const newCount = data.reports.filter((r) => r.status === "open").length;

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
            {key === "reports" && newCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{newCount}</span>}
          </button>
        ))}
      </div>
      {tab === "reports" && <ReportsTab data={data} setData={setData} />}
      {tab === "trends" && <TrendsTab data={data} />}
      {tab === "board" && <BoardTab data={data} setData={setData} />}
    </div>
  );
}
