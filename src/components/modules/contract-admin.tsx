"use client";

import { useEffect, useState } from "react";
import { FileSignature, FileText, Send } from "lucide-react";
import { jsonFetch } from "@/components/modules/ui-bits";
import { DocumentsTab } from "@/components/modules/contract/documents-tab";
import { SendTab } from "@/components/modules/contract/send-tab";
import { TemplatesTab } from "@/components/modules/contract/templates-tab";
import type { ContractData } from "@/components/modules/contract/types";

const TABS = [
  { key: "documents", label: "Documents", icon: FileSignature },
  { key: "send", label: "Send", icon: Send },
  { key: "templates", label: "Templates", icon: FileText },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function ContractAdmin() {
  const [data, setData] = useState<ContractData | null>(null);
  const [tab, setTab] = useState<Tab>("documents");
  const [selected, setSelected] = useState<string | null>(null);
  const [sendTemplate, setSendTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    jsonFetch<ContractData>("/api/modules/contract")
      .then((d) => {
        setData(d);
        if (!d.documents.length) setTab(d.templates.length ? "send" : "templates");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading documents…</p>;
  const countersign = data.documents.filter((d) => d.status === "awaiting_countersign").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => { setTab(key); if (key === "send") setSendTemplate(null); }}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="size-4" />
            {label}
            {key === "documents" && countersign > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white" title="Waiting for your countersignature">{countersign}</span>}
          </button>
        ))}
      </div>
      {tab === "documents" && <DocumentsTab data={data} setData={setData} selected={selected} setSelected={setSelected} />}
      {tab === "send" && (
        <SendTab
          key={sendTemplate ?? "default"}
          data={data}
          initialTemplate={sendTemplate}
          onSent={(docs) => setData((cur) => (cur ? { ...cur, documents: [...docs, ...cur.documents] } : cur))}
          openDoc={(id) => { setSelected(id); setTab("documents"); }}
        />
      )}
      {tab === "templates" && <TemplatesTab data={data} setData={setData} sendWith={(id) => { setSendTemplate(id); setTab("send"); }} />}
    </div>
  );
}
