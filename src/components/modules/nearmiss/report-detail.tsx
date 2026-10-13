"use client";

import { useRef, useState } from "react";
import { Camera, FileText, Link2, MessageCircle, RotateCcw, Trash2, X } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { selectClass, textareaClass } from "@/components/modules/nearmiss/report-form";
import { fmtDate, type Report } from "@/components/modules/nearmiss/types";
import { fileToCompressedDataUrl } from "@/lib/image-compress";
import { CATEGORIES, MAX_REPORT_PHOTOS, SEVERITIES, severityLabel, severityTone, statusLabel, typeLabel } from "@/lib/modules/nearmiss-options";
import { isWaPhone, waLink } from "@/lib/phone";

export function StatusPill({ report }: { report: Report }) {
  const tone =
    report.status === "closed"
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      : report.overdue
        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
        : report.status === "triaged"
          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {report.overdue && report.status !== "closed" ? "Overdue" : statusLabel(report.status)}
    </span>
  );
}

export function SeverityPill({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${severityTone(value)}`}>{severityLabel(value)}</span>;
}

export function ReportDetail({
  report,
  company,
  canManage,
  onChange,
  onDeleted,
  onClose,
}: {
  report: Report;
  company: string;
  canManage: boolean;
  onChange: (r: Report) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState({
    category: report.category ?? "",
    riskRating: report.riskRating ?? report.potentialSeverity ?? "",
    assignedTo: report.assignedTo ?? "",
    correctiveAction: report.correctiveAction ?? "",
    dueDate: report.dueDate ?? "",
    feedback: report.feedback ?? "",
  });
  const [closeNote, setCloseNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const closed = report.status === "closed";

  async function run(key: string, fn: () => Promise<{ report?: Report }>, okText?: string) {
    setBusy(key);
    setError(null);
    setSaved(null);
    try {
      const d = await fn();
      if (d.report) onChange(d.report);
      if (okText) setSaved(okText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const patch = (body: object) => jsonFetch<{ report: Report }>(`/api/modules/nearmiss/${report.id}`, { method: "PATCH", body: JSON.stringify(body) });

  const savePlan = () =>
    run("plan", () =>
      patch({
        action: "triage",
        category: plan.category || null,
        riskRating: plan.riskRating || null,
        assignedTo: plan.assignedTo,
        correctiveAction: plan.correctiveAction,
        dueDate: plan.dueDate || null,
        feedback: plan.feedback,
      }), "Action plan saved");

  const closeOut = () => run("close", () => patch({ action: "close", closeOutNote: closeNote, feedback: plan.feedback }), "Report closed");
  const reopen = () => run("reopen", () => patch({ action: "reopen" }));

  async function addPhoto(file: File) {
    await run("photo", async () => {
      const dataUrl = await fileToCompressedDataUrl(file);
      return jsonFetch(`/api/modules/nearmiss/${report.id}/photos`, { method: "POST", body: JSON.stringify({ dataUrl }) });
    });
    if (photoInput.current) photoInput.current.value = "";
  }
  const removePhoto = (url: string) =>
    run("photo", () => jsonFetch(`/api/modules/nearmiss/${report.id}/photos`, { method: "DELETE", body: JSON.stringify({ url }) }));

  async function remove() {
    if (!confirm(`Delete report ${report.reference}? This cannot be undone.`)) return;
    await run("delete", async () => {
      await jsonFetch(`/api/modules/nearmiss/${report.id}`, { method: "DELETE" });
      onDeleted(report.id);
      return {};
    });
  }

  const first = report.reporterName?.split(/\s+/)[0];
  const waText = [
    `Hi${first ? ` ${first}` : ""}, this is the safety team at ${company}.`,
    `Thank you for reporting ${report.reference}.`,
    closed ? `It has been CLOSED. ${report.closeOutNote ?? ""}`.trim() : report.feedback ? `Update: ${report.feedback}` : "We are looking into it.",
    report.trackingUrl ? `Follow progress here: ${report.trackingUrl}` : "",
  ].filter(Boolean).join("\n\n");

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{report.reference} · reported {fmtDate(report.createdAt)}</p>
          <h3 className="text-lg font-semibold">{typeLabel(report.reportType)}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5"><StatusPill report={report} /><SeverityPill value={report.riskRating ?? report.potentialSeverity} /></div>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
      </div>

      <p className="whitespace-pre-line text-sm">{report.description}</p>
      {report.photos.length > 0 && <Photos urls={report.photos} />}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Location</dt><dd>{report.locationHint ?? "-"}</dd>
        <dt className="text-muted-foreground">Date of event</dt><dd>{fmtDate(report.occurredAt)}</dd>
        <dt className="text-muted-foreground">Hazard type</dt><dd>{report.category ?? "-"}</dd>
        <dt className="text-muted-foreground">Could have been</dt><dd>{severityLabel(report.potentialSeverity)}</dd>
        <dt className="text-muted-foreground">Reporter did</dt><dd>{report.immediateAction ?? "-"}</dd>
        <dt className="text-muted-foreground">Reported by</dt>
        <dd>{report.reporterName ? `${report.reporterName}${report.reporterContact ? ` · ${report.reporterContact}` : ""}` : "Anonymous"}</dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`/api/modules/nearmiss/${report.id}/pdf`} target="_blank" rel="noreferrer"><FileText className="size-4" />PDF</a>
        </Button>
        {isWaPhone(report.reporterContact) && (
          <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
            <a href={waLink(report.reporterContact, waText)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp reporter</a>
          </Button>
        )}
        {report.trackingUrl && (
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(report.trackingUrl!).then(() => setSaved("Tracking link copied"))}>
            <Link2 className="size-4" />Copy tracking link
          </Button>
        )}
        {canManage && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === "delete"} onClick={remove}>
            <Trash2 className="size-4" />Delete
          </Button>
        )}
      </div>

      <section className="space-y-3 border-t pt-4">
        <h4 className="font-medium">Investigation & action plan</h4>
        <fieldset disabled={closed} className="space-y-3 disabled:opacity-70">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nm-p-cat">Hazard type</Label>
              <select id="nm-p-cat" className={selectClass} value={plan.category} onChange={(e) => setPlan({ ...plan, category: e.target.value })}>
                <option value="">Not set</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nm-p-risk">Risk rating</Label>
              <select id="nm-p-risk" className={selectClass} value={plan.riskRating} onChange={(e) => setPlan({ ...plan, riskRating: e.target.value })}>
                <option value="">Not set</option>
                {SEVERITIES.map((s) => <option key={s.key} value={s.key}>{s.label} – {s.hint}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-p-action">Corrective action</Label>
            <textarea id="nm-p-action" className={textareaClass} maxLength={2000} placeholder="What will be done to stop it happening again?" value={plan.correctiveAction} onChange={(e) => setPlan({ ...plan, correctiveAction: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nm-p-who">Responsible person</Label>
              <Input id="nm-p-who" maxLength={120} value={plan.assignedTo} onChange={(e) => setPlan({ ...plan, assignedTo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nm-p-due">Due date</Label>
              <Input id="nm-p-due" type="date" value={plan.dueDate} onChange={(e) => setPlan({ ...plan, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-p-fb">Message to the reporter</Label>
            <Input id="nm-p-fb" maxLength={1000} placeholder="Shown on their tracking page, e.g. Thanks, the guard will be replaced this week." value={plan.feedback} onChange={(e) => setPlan({ ...plan, feedback: e.target.value })} />
          </div>
          {!closed && <Button size="sm" disabled={busy === "plan"} onClick={savePlan}>{busy === "plan" ? "Saving…" : "Save action plan"}</Button>}
        </fieldset>
      </section>

      <section className="space-y-3 border-t pt-4">
        <h4 className="font-medium">Close-out</h4>
        <div className="space-y-1.5">
          <Label>After photos (proof it was fixed)</Label>
          <div className="flex flex-wrap gap-2">
            {report.closeOutPhotos.map((u) => (
              <div key={u} className="relative size-20 overflow-hidden rounded-md border">
                <a href={u} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="Close-out" className="size-full object-cover" />
                </a>
                {!closed && (
                  <button type="button" aria-label="Remove photo" onClick={() => removePhoto(u)} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {!closed && report.closeOutPhotos.length < MAX_REPORT_PHOTOS && (
              <button
                type="button"
                disabled={busy === "photo"}
                onClick={() => photoInput.current?.click()}
                className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted"
              >
                <Camera className="size-5" />{busy === "photo" ? "Uploading…" : "Add photo"}
              </button>
            )}
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); }} />
          </div>
        </div>
        {closed ? (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Closed</span> {fmtDate(report.closedAt)} by {report.closedBy ?? "-"}</p>
            <p className="whitespace-pre-line">{report.closeOutNote}</p>
            <Button size="sm" variant="outline" disabled={busy === "reopen"} onClick={reopen}><RotateCcw className="size-4" />Reopen</Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="nm-close">What was done?</Label>
              <textarea id="nm-close" className={textareaClass} maxLength={2000} placeholder="e.g. Guard refitted and machine tested. Operators briefed at toolbox talk." value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
            </div>
            <Button size="sm" variant="secondary" disabled={busy === "close" || closeNote.trim().length < 3} onClick={closeOut}>
              {busy === "close" ? "Closing…" : "Close report"}
            </Button>
          </>
        )}
      </section>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">{saved}</p>}
    </div>
  );
}

function Photos({ urls }: { urls: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" className="size-24 overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="Report photo" className="size-full object-cover" />
        </a>
      ))}
    </div>
  );
}
