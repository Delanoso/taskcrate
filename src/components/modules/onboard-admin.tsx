"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { PacketDetail } from "@/components/modules/onboard/packet-detail";
import { PacketForm, type PacketPayload } from "@/components/modules/onboard/packet-form";
import { STATUS, fmtDate } from "@/components/modules/onboard/types";
import type { PacketSummary } from "@/lib/modules/onboard-server";

type Data = { company: string; canManage: boolean; leavePlanner: boolean; packets: PacketSummary[] };

const FILTERS = [
  { key: "review", label: "To review", match: (s: string) => s === "submitted" },
  { key: "waiting", label: "Waiting on new hire", match: (s: string) => ["sent", "in_progress", "changes_requested"].includes(s) },
  { key: "approved", label: "Approved", match: (s: string) => s === "approved" },
  { key: "all", label: "All", match: () => true },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export function OnboardAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    jsonFetch<Data>("/api/modules/onboard")
      .then((d) => {
        setData(d);
        if (d.packets.some((p) => p.status === "submitted")) setFilter("review");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const f = FILTERS.find((x) => x.key === filter)!;
    const term = q.trim().toLowerCase();
    return data.packets.filter(
      (p) => f.match(p.status) && (!term || [p.employeeName, p.employeeNumber, p.jobTitle, p.department].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [data, filter, q]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading onboarding packs…</p>;

  async function create(v: PacketPayload) {
    const d = await jsonFetch<{ packet: PacketSummary }>("/api/modules/onboard", { method: "POST", body: JSON.stringify(v) });
    setData({ ...data!, packets: [d.packet, ...data!.packets] });
    setCreating(false);
    setFilter("waiting");
    setSelected(d.packet.id);
  }

  const replace = (p: PacketSummary) => setData({ ...data, packets: data.packets.map((x) => (x.id === p.id ? { ...x, ...p } : x)) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {f.label} <span className="opacity-70">{data.packets.filter((p) => f.match(p.status)).length}</span>
          </button>
        ))}
        <Button size="sm" className="ml-auto" onClick={() => { setCreating((v) => !v); setSelected(null); }}><Plus className="size-4" />New hire</Button>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search name, number, job title…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {creating && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">New hire onboarding pack</h3>
          <p className="mb-3 text-sm text-muted-foreground">You&apos;ll get a secure link to send them. They fill in their details, bank account and upload documents from their phone.</p>
          <PacketForm submitLabel="Create link" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {data.packets.length ? "Nothing in this list." : "No onboarding packs yet. Click New hire to send your first one."}
            </p>
          )}
          {rows.map((p) => {
            const st = STATUS[p.status] ?? STATUS.sent;
            return (
              <button key={p.id} type="button" onClick={() => { setSelected(p.id); setCreating(false); }}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${selected === p.id ? "border-primary bg-primary/5" : "bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.employeeName}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.tone}`}>{st.label}</span>
                </div>
                <p className="mt-0.5 text-muted-foreground">{[p.jobTitle, p.department].filter(Boolean).join(" · ") || "No job title"}{p.startDate ? ` · starts ${fmtDate(p.startDate)}` : ""}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${p.progress.percent}%` }} /></div>
                  <span className="text-xs text-muted-foreground">{p.progress.done}/{p.progress.total}</span>
                </div>
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <PacketDetail
              key={selected}
              id={selected}
              company={data.company}
              canManage={data.canManage}
              leavePlanner={data.leavePlanner}
              onChange={replace}
              onDeleted={(id) => { setSelected(null); setData({ ...data, packets: data.packets.filter((x) => x.id !== id) }); }}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
