"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { PhotoList } from "@/components/modules/photo-list";
import { localDateTime, selectClass, textareaClass, type Case, type Person } from "@/components/modules/discipline/types";
import { OFFENCES, SEVERITY_LABEL } from "@/lib/modules/discipline-options";

export type CasePayload = {
  employeeName: string;
  employeeNumber: string | null;
  employeePhone: string | null;
  jobTitle: string | null;
  department: string | null;
  offenceKey: string;
  offence: string;
  incidentAt: string;
  location: string | null;
  witnesses: string | null;
  notes: string;
  photos?: string[];
};

const blank = (s: string) => s.trim() || null;

/** New case (with evidence photos) or edit of an open case's details. */
export function CaseForm({
  directory,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  directory: Person[];
  initial?: Case;
  submitLabel: string;
  onSubmit: (p: CasePayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState({
    employeeName: initial?.employeeName ?? "",
    employeeNumber: initial?.employeeNumber ?? "",
    employeePhone: initial?.employeePhone ?? "",
    jobTitle: initial?.jobTitle ?? "",
    department: initial?.department ?? "",
    offenceKey: initial?.offenceKey ?? "",
    offence: initial?.offence ?? "",
    incidentAt: localDateTime(initial?.incidentAt),
    location: initial?.location ?? "",
    witnesses: initial?.witnesses ?? "",
    notes: initial?.description ?? "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof v>) => setV((cur) => ({ ...cur, ...patch }));
  const offence = OFFENCES.find((o) => o.key === v.offenceKey);

  function pickName(name: string) {
    const p = directory.find((d) => d.employeeName.toLowerCase() === name.trim().toLowerCase());
    if (!p) return set({ employeeName: name });
    set({
      employeeName: p.employeeName,
      employeeNumber: p.employeeNumber ?? v.employeeNumber,
      employeePhone: p.employeePhone ?? v.employeePhone,
      jobTitle: p.jobTitle ?? v.jobTitle,
      department: p.department ?? v.department,
    });
  }

  function pickOffence(key: string) {
    const o = OFFENCES.find((x) => x.key === key);
    const prev = OFFENCES.find((x) => x.key === v.offenceKey);
    // Replace the charge wording only if the user has not edited the previous template.
    const untouched = !v.offence.trim() || v.offence === prev?.charge;
    set({ offenceKey: key, offence: untouched ? o?.charge ?? "" : v.offence });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        employeeName: v.employeeName.trim(),
        employeeNumber: blank(v.employeeNumber),
        employeePhone: blank(v.employeePhone),
        jobTitle: blank(v.jobTitle),
        department: blank(v.department),
        offenceKey: v.offenceKey,
        offence: v.offence.trim(),
        incidentAt: v.incidentAt,
        location: blank(v.location),
        witnesses: blank(v.witnesses),
        notes: v.notes.trim(),
        ...(initial ? {} : { photos }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold">Employee</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dc-name">Full name</Label>
            <Input id="dc-name" list="dc-people" required minLength={2} maxLength={120} value={v.employeeName} onChange={(e) => pickName(e.target.value)} />
            <datalist id="dc-people">{directory.map((p) => <option key={`${p.employeeName}-${p.employeeNumber}`} value={p.employeeName} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-num">Employee number</Label>
            <Input id="dc-num" maxLength={40} value={v.employeeNumber} onChange={(e) => set({ employeeNumber: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-phone">Cellphone (for WhatsApp)</Label>
            <Input id="dc-phone" type="tel" maxLength={40} value={v.employeePhone} onChange={(e) => set({ employeePhone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dc-job">Job title</Label>
              <Input id="dc-job" maxLength={80} value={v.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-dept">Department</Label>
              <Input id="dc-dept" maxLength={80} value={v.department} onChange={(e) => set({ department: e.target.value })} />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold">Incident</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dc-off">Offence</Label>
            <select id="dc-off" required className={selectClass} value={v.offenceKey} onChange={(e) => pickOffence(e.target.value)}>
              <option value="">Choose…</option>
              {(["minor", "serious", "dismissible"] as const).map((sev) => (
                <optgroup key={sev} label={SEVERITY_LABEL[sev]}>
                  {OFFENCES.filter((o) => o.severity === sev && o.key !== "other").map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </optgroup>
              ))}
              <option value="other">Other (describe)</option>
            </select>
            {offence && <p className="text-xs text-muted-foreground">{SEVERITY_LABEL[offence.severity]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-when">Date and time of incident</Label>
            <Input id="dc-when" type="datetime-local" required max={localDateTime()} value={v.incidentAt} onChange={(e) => set({ incidentAt: e.target.value })} />
            <p className="text-xs text-muted-foreground">Can be back-dated to when it happened.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dc-charge">Charge (as it will appear on the documents)</Label>
          <textarea id="dc-charge" required minLength={5} maxLength={1000} className={textareaClass} value={v.offence} onChange={(e) => set({ offence: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dc-notes">What happened</Label>
          <textarea id="dc-notes" required minLength={5} maxLength={5000} className={`${textareaClass} min-h-28`} placeholder="Facts only: who, what, when, where. What did the employee say?" value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dc-loc">Place</Label>
            <Input id="dc-loc" maxLength={200} value={v.location} onChange={(e) => set({ location: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dc-wit">Witnesses</Label>
            <Input id="dc-wit" maxLength={500} placeholder="Names, comma separated" value={v.witnesses} onChange={(e) => set({ witnesses: e.target.value })} />
          </div>
        </div>
        {!initial && (
          <div className="space-y-1.5">
            <Label>Evidence photos</Label>
            <p className="text-xs text-muted-foreground">Photograph the scene, damage, statements or a written warning on paper.</p>
            <PhotoList value={photos} onChange={setPhotos} max={8} label="Add" />
          </div>
        )}
      </fieldset>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
