"use client";

import { useEffect, useState } from "react";
import { PhotoList } from "@/components/modules/photo-list";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { closeGaps, sideLabels, type JobCardView, type JobPriority } from "@/lib/modules/jobcard-shared";

const textareaClass = "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type PartDraft = { name: string; qty: string; cost: string };
type Draft = {
  title: string;
  machineRef: string;
  location: string;
  priority: JobPriority;
  description: string;
  reportedByName: string;
  reportedByPhone: string;
  openComment: string;
  mechanicName: string;
  workComment: string;
  hoursWorked: string;
  downtimeHours: string;
  parts: PartDraft[];
  acceptName: string;
  acceptComment: string;
};

function draftFrom(job: JobCardView): Draft {
  return {
    title: job.title,
    machineRef: job.machineRef ?? "",
    location: job.location ?? "",
    priority: job.priority,
    description: job.description ?? "",
    reportedByName: job.reportedByName ?? "",
    reportedByPhone: job.reportedByPhone ?? "",
    openComment: job.openComment ?? "",
    mechanicName: job.mechanicName ?? "",
    workComment: job.workComment ?? "",
    hoursWorked: job.hoursWorked == null ? "" : String(job.hoursWorked),
    downtimeHours: job.downtimeHours == null ? "" : String(job.downtimeHours),
    parts: job.parts.map((part) => ({ name: part.name, qty: String(part.qty), cost: String(part.cost) })),
    acceptName: job.acceptName ?? "",
    acceptComment: job.acceptComment ?? "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function JobCardEditor({
  job,
  saveUrl,
  method = "POST",
  extraBody,
  onSaved,
}: {
  job: JobCardView;
  saveUrl: string;
  method?: "POST" | "PATCH";
  extraBody?: Record<string, unknown>;
  onSaved: (job: JobCardView) => void;
}) {
  const labels = sideLabels(job.mode);
  const [draft, setDraft] = useState(() => draftFrom(job));
  const [openSig, setOpenSig] = useState<string | null>(null);
  const [techSig, setTechSig] = useState<string | null>(null);
  const [acceptSig, setAcceptSig] = useState<string | null>(null);
  const [openPhotos, setOpenPhotos] = useState<string[]>([]);
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(draftFrom(job));
    setOpenSig(null);
    setTechSig(null);
    setAcceptSig(null);
    setOpenPhotos([]);
    setWorkPhotos([]);
    setError(null);
  }, [job.id, job.updatedAt]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function payload(status?: "scheduled" | "in_progress" | "done") {
    const parts = draft.parts
      .map((part) => ({ name: part.name.trim(), qty: Number(part.qty), cost: Number(part.cost) }))
      .filter((part) => part.name && Number.isFinite(part.qty) && part.qty > 0 && Number.isFinite(part.cost) && part.cost >= 0);
    const hours = draft.hoursWorked.trim() === "" ? null : Number(draft.hoursWorked);
    const downtime = draft.downtimeHours.trim() === "" ? null : Number(draft.downtimeHours);
    return {
      ...extraBody,
      title: draft.title.trim(),
      machineRef: draft.machineRef.trim() || null,
      location: draft.location.trim() || null,
      priority: draft.priority,
      description: draft.description.trim() || null,
      reportedByName: draft.reportedByName.trim() || null,
      reportedByPhone: draft.reportedByPhone.trim() || null,
      openComment: draft.openComment.trim() || null,
      mechanicName: draft.mechanicName.trim() || null,
      workComment: draft.workComment.trim() || null,
      hoursWorked: hours,
      downtimeHours: job.mode === "internal" ? downtime : undefined,
      parts,
      acceptName: draft.acceptName.trim() || null,
      acceptComment: draft.acceptComment.trim() || null,
      ...(openSig ? { openSignature: openSig } : {}),
      ...(techSig ? { technicianSignature: techSig } : {}),
      ...(acceptSig ? { acceptSignature: acceptSig } : {}),
      newPhotos: [
        ...openPhotos.map((dataUrl) => ({ dataUrl, side: "open" as const })),
        ...workPhotos.map((dataUrl) => ({ dataUrl, side: "work" as const })),
      ],
      ...(status ? { status } : {}),
    };
  }

  async function save(status?: "scheduled" | "in_progress" | "done") {
    setBusy(true);
    setError(null);
    try {
      if (status === "scheduled" && !draft.mechanicName.trim() && !job.mechanicName) {
        throw new Error("Add the technician name before scheduling.");
      }
      const data = await jsonFetch<{ job: JobCardView }>(saveUrl, {
        method,
        body: JSON.stringify(payload(status)),
      });
      onSaved(data.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the job card.");
    } finally {
      setBusy(false);
    }
  }

  const gaps = closeGaps({
    reportedByName: draft.reportedByName,
    description: draft.description,
    openComment: draft.openComment,
    openSignature: openSig || job.openSignature,
    mechanicName: draft.mechanicName,
    workComment: draft.workComment,
    technicianSignature: techSig || job.technicianSignature,
    hoursWorked: draft.hoursWorked.trim() === "" ? null : Number(draft.hoursWorked),
    acceptName: draft.acceptName,
    acceptSignature: acceptSig || job.acceptSignature,
  }, job.mode);

  return (
    <form
      className="space-y-5 rounded-xl border bg-card p-4 print:hidden sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        save().catch(() => undefined);
      }}
    >
      <div>
        <h3 className="font-semibold">Update this job card</h3>
        <p className="text-sm text-muted-foreground">Comments, photos, names, and signatures go on both sides. The card closes when everything needed is signed.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Opening side</h4>
          <Field label="Job title">
            <Input value={draft.title} minLength={2} onChange={(event) => set("title", event.target.value)} required />
          </Field>
          <Field label={labels.asset}>
            <Input value={draft.machineRef} onChange={(event) => set("machineRef", event.target.value)} />
          </Field>
          <Field label={labels.place}>
            <Input value={draft.location} onChange={(event) => set("location", event.target.value)} />
          </Field>
          <Field label="Priority">
            <select className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" value={draft.priority} onChange={(event) => set("priority", event.target.value as JobPriority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Reported by">
            <Input value={draft.reportedByName} onChange={(event) => set("reportedByName", event.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={draft.reportedByPhone} onChange={(event) => set("reportedByPhone", event.target.value)} />
          </Field>
          <Field label="What is wrong">
            <textarea className={textareaClass} maxLength={4000} value={draft.description} onChange={(event) => set("description", event.target.value)} />
          </Field>
          <Field label="Comment on the opening side">
            <textarea className={textareaClass} maxLength={4000} placeholder="What else should the technician know?" value={draft.openComment} onChange={(event) => set("openComment", event.target.value)} />
          </Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Photo of the problem</p>
            <PhotoList value={openPhotos} onChange={setOpenPhotos} max={4} label="Add photo" />
          </div>
          {job.openSignature ? (
            <p className="text-sm text-muted-foreground">Opening signature is already on the card.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Signature of {draft.reportedByName.trim() || "the person opening it"}</p>
              <SignaturePad key={`${job.updatedAt}-open`} onChange={setOpenSig} height={130} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Work side</h4>
          <Field label="Technician">
            <Input value={draft.mechanicName} onChange={(event) => set("mechanicName", event.target.value)} />
          </Field>
          <Field label="Hours on the job">
            <Input type="number" min="0" step="0.1" value={draft.hoursWorked} onChange={(event) => set("hoursWorked", event.target.value)} />
          </Field>
          {job.mode === "internal" && (
            <Field label="Downtime hours">
              <Input type="number" min="0" step="0.1" value={draft.downtimeHours} onChange={(event) => set("downtimeHours", event.target.value)} />
            </Field>
          )}
          <Field label="Comment on the work">
            <textarea className={textareaClass} maxLength={4000} placeholder="What was done" value={draft.workComment} onChange={(event) => set("workComment", event.target.value)} />
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">Parts used</p>
            {draft.parts.map((part, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_4.5rem_6rem_auto]">
                <Input placeholder="Part" value={part.name} onChange={(event) => set("parts", draft.parts.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} />
                <Input type="number" min="1" step="1" aria-label="Quantity" value={part.qty} onChange={(event) => set("parts", draft.parts.map((row, i) => i === index ? { ...row, qty: event.target.value } : row))} />
                <Input type="number" min="0" step="0.01" aria-label="Cost in rand" value={part.cost} onChange={(event) => set("parts", draft.parts.map((row, i) => i === index ? { ...row, cost: event.target.value } : row))} />
                <Button type="button" variant="ghost" onClick={() => set("parts", draft.parts.filter((_, i) => i !== index))}>Remove</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set("parts", [...draft.parts, { name: "", qty: "1", cost: "0" }])}>Add part</Button>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Photo of the work</p>
            <PhotoList value={workPhotos} onChange={setWorkPhotos} max={4} label="Add photo" />
          </div>
          {job.technicianSignature ? (
            <p className="text-sm text-muted-foreground">Technician signature is already on the card.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Technician signature</p>
              <SignaturePad key={`${job.updatedAt}-tech`} onChange={setTechSig} height={130} />
            </div>
          )}

          <h4 className="pt-2 text-sm font-semibold">Sign-off</h4>
          <Field label={labels.accept}>
            <Input value={draft.acceptName} onChange={(event) => set("acceptName", event.target.value)} />
          </Field>
          <Field label={labels.acceptComment}>
            <textarea className={textareaClass} maxLength={4000} value={draft.acceptComment} onChange={(event) => set("acceptComment", event.target.value)} />
          </Field>
          {job.acceptSignature ? (
            <p className="text-sm text-muted-foreground">Sign-off signature is already on the card.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{labels.acceptSign}</p>
              <SignaturePad key={`${job.updatedAt}-accept`} onChange={setAcceptSig} height={130} />
            </div>
          )}
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">Still needed to close</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {gaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>Save</Button>
        {job.status === "open" && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => save("scheduled")}>Schedule</Button>
        )}
        {(job.status === "open" || job.status === "scheduled") && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => save("in_progress")}>Start work</Button>
        )}
        <Button type="button" disabled={busy} onClick={() => save("done")}>Close job card</Button>
      </div>
    </form>
  );
}
