"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { PhotoList } from "@/components/modules/photo-list";
import { CATEGORIES, MAX_REPORT_PHOTOS, REPORT_TYPES, SEVERITIES, type ReportTypeKey, type SeverityKey } from "@/lib/modules/nearmiss-options";

export const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
export const textareaClass = "min-h-24 w-full rounded-md border bg-background p-2 text-sm";

const OTHER = "__other__";
const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

export type ReportPayload = {
  reportType: ReportTypeKey;
  category: string | null;
  potentialSeverity: SeverityKey | null;
  description: string;
  immediateAction: string | null;
  locationHint: string | null;
  occurredOn: string | null;
  reporterName: string | null;
  reporterContact: string | null;
  photos: string[];
};

/** Near-miss / hazard report fields; `onSubmit` throws to show an error. */
export function ReportForm({
  locations,
  anonymous,
  submitLabel,
  onSubmit,
}: {
  locations: string[];
  /** Public form: identity is opt-in. Staff form: "reported by" is a plain optional field. */
  anonymous: boolean;
  submitLabel: string;
  onSubmit: (payload: ReportPayload) => Promise<void>;
}) {
  const [reportType, setReportType] = useState<ReportTypeKey>("near_miss");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState<SeverityKey | "">("");
  const [description, setDescription] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [location, setLocation] = useState(locations.length ? "" : OTHER);
  const [otherLocation, setOtherLocation] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayKey());
  const [shareName, setShareName] = useState(!anonymous);
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        reportType,
        category: category || null,
        potentialSeverity: severity || null,
        description: description.trim(),
        immediateAction: immediateAction.trim() || null,
        locationHint: (location === OTHER ? otherLocation : location).trim() || null,
        occurredOn: occurredOn || null,
        reporterName: shareName ? reporterName.trim() || null : null,
        reporterContact: shareName ? reporterContact.trim() || null : null,
        photos,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>What are you reporting?</Label>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setReportType(t.key)}
              className={`rounded-md border p-2 text-left text-sm transition-colors ${
                reportType === t.key ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{REPORT_TYPES.find((t) => t.key === reportType)?.hint}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nm-desc">What happened or what did you see?</Label>
        <textarea
          id="nm-desc"
          className={textareaClass}
          required
          minLength={5}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Forklift reversed past the walkway without hooting; a worker had to jump out of the way."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Photos (optional)</Label>
        <PhotoList value={photos} onChange={setPhotos} max={MAX_REPORT_PHOTOS} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nm-loc">Where?</Label>
          {locations.length > 0 && (
            <select id="nm-loc" className={selectClass} value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Choose an area…</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value={OTHER}>Somewhere else</option>
            </select>
          )}
          {location === OTHER && (
            <Input id={locations.length ? undefined : "nm-loc"} placeholder="e.g. Workshop bay 3" maxLength={200} value={otherLocation} onChange={(e) => setOtherLocation(e.target.value)} />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nm-date">When?</Label>
          <Input id="nm-date" type="date" max={todayKey()} value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nm-cat">Type of hazard</Label>
          <select id="nm-cat" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Not sure</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nm-sev">How bad could it have been?</Label>
          <select id="nm-sev" className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value as SeverityKey | "")}>
            <option value="">Not sure</option>
            {SEVERITIES.map((s) => <option key={s.key} value={s.key}>{s.label} – {s.hint}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nm-imm">Did you do anything about it? (optional)</Label>
        <Input id="nm-imm" maxLength={2000} placeholder="e.g. Put a cone over the spill and told the supervisor" value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} />
      </div>

      {anonymous ? (
        <div className="space-y-2 rounded-md border p-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={shareName} onChange={(e) => setShareName(e.target.checked)} />
            <span>Add my name so the safety team can follow up with me <span className="text-muted-foreground">(optional, leave unticked to stay anonymous)</span></span>
          </label>
          {shareName && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Your name" maxLength={120} value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
              <Input placeholder="Cellphone (optional)" maxLength={120} value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nm-by">Reported by (optional)</Label>
            <Input id="nm-by" maxLength={120} value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-contact">Their cellphone (optional)</Label>
            <Input id="nm-contact" maxLength={120} value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} />
          </div>
        </div>
      )}

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : submitLabel}</Button>
    </form>
  );
}
