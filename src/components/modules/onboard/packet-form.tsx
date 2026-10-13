"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { DEFAULT_ITEMS, ONBOARD_ITEMS } from "@/lib/modules/onboard-items";
import type { PacketSummary } from "@/lib/modules/onboard-server";

export type PacketPayload = {
  employeeName: string;
  employeePhone: string;
  employeeEmail: string;
  employeeNumber: string;
  jobTitle: string;
  department: string;
  startDate: string;
  requirements: string[];
};

export function PacketForm({
  initial,
  initialRequirements,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: PacketSummary;
  initialRequirements?: string[];
  submitLabel: string;
  onSubmit: (p: PacketPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState({
    employeeName: initial?.employeeName ?? "",
    employeePhone: initial?.employeePhone ?? "",
    employeeEmail: initial?.employeeEmail ?? "",
    employeeNumber: initial?.employeeNumber ?? "",
    jobTitle: initial?.jobTitle ?? "",
    department: initial?.department ?? "",
    startDate: initial?.startDate ?? "",
  });
  const [reqs, setReqs] = useState<string[]>(initialRequirements ?? [...DEFAULT_ITEMS]);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const toggle = (k: string) => setReqs((r) => (r.includes(k) ? r.filter((x) => x !== k) : [...r, k]));
  const customs = reqs.filter((k) => k.startsWith("custom:"));

  function addCustom() {
    const label = custom.trim().slice(0, 80);
    if (label.length < 2) return;
    const key = `custom:${label}`;
    if (!reqs.includes(key)) setReqs([...reqs, key]);
    setCustom("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reqs.length) return setError("Choose at least one document to collect.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...v, requirements: reqs });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Full name" id="ob-n"><Input id="ob-n" required minLength={2} value={v.employeeName} onChange={(e) => set({ employeeName: e.target.value })} /></F>
        <F label="Cellphone / WhatsApp" id="ob-p"><Input id="ob-p" type="tel" placeholder="082 123 4567" value={v.employeePhone} onChange={(e) => set({ employeePhone: e.target.value })} /></F>
        <F label="Email (optional)" id="ob-e"><Input id="ob-e" type="email" value={v.employeeEmail} onChange={(e) => set({ employeeEmail: e.target.value })} /></F>
        <F label="Employee number (optional)" id="ob-no"><Input id="ob-no" value={v.employeeNumber} onChange={(e) => set({ employeeNumber: e.target.value })} /></F>
        <F label="Job title" id="ob-j"><Input id="ob-j" value={v.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} /></F>
        <F label="Department" id="ob-d"><Input id="ob-d" value={v.department} onChange={(e) => set({ department: e.target.value })} /></F>
        <F label="Start date" id="ob-s"><Input id="ob-s" type="date" value={v.startDate} onChange={(e) => set({ startDate: e.target.value })} /></F>
      </div>
      <div className="space-y-2">
        <Label>Documents to collect</Label>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {ONBOARD_ITEMS.map((i) => (
            <label key={i.key} className="flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm hover:bg-muted/50">
              <input type="checkbox" className="mt-0.5 size-4" checked={reqs.includes(i.key)} onChange={() => toggle(i.key)} />
              <span>{i.label}</span>
            </label>
          ))}
        </div>
        {customs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {customs.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs">
                {k.slice(7)}
                <button type="button" aria-label={`Remove ${k.slice(7)}`} onClick={() => toggle(k)}><X className="size-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input placeholder="Something else, e.g. Firearm competency" value={custom} maxLength={80} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
          <Button type="button" variant="outline" onClick={addCustom}><Plus className="size-4" />Add</Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function F({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
