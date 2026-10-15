"use client";

import { useState } from "react";
import { PhotoInput } from "@/components/modules/photo-input";
import { PhotoList } from "@/components/modules/photo-list";
import { Button, Input } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { PANEL_SIDES, PRETRIP_CHECKS, formatKm } from "@/lib/modules/pretrip-shared";

const textareaClass = "min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type PretripPayload = {
  driverName: string;
  licenceNo?: string;
  site?: string;
  startKm: number;
  checks: { key: string; pass: boolean }[];
  faultNote?: string;
  photos: { side: string; dataUrl: string }[];
  driverSignature: string;
};

export type HandoverPayload = {
  fromName: string;
  fromSignature: string;
  toName: string;
  toSignature: string;
  handoverKm: number;
  note?: string;
  photos?: { side: string; dataUrl: string }[];
};

export type ClosePayload = {
  endDriverName: string;
  endSignature: string;
  endKm: number;
  endNote?: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function PretripForm({
  lastEndKm,
  busy,
  onSubmit,
}: {
  lastEndKm: number | null;
  busy: boolean;
  onSubmit: (payload: PretripPayload) => Promise<void>;
}) {
  const [driverName, setDriverName] = useState("");
  const [licenceNo, setLicenceNo] = useState("");
  const [site, setSite] = useState("");
  const [startKm, setStartKm] = useState(lastEndKm == null ? "" : String(lastEndKm));
  const [checks, setChecks] = useState<Record<string, boolean | null>>({});
  const [faultNote, setFaultNote] = useState("");
  const [panels, setPanels] = useState<Record<string, string | null>>({});
  const [damage, setDamage] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const failed = PRETRIP_CHECKS.filter((check) => checks[check.key] === false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (driverName.trim().length < 2) return setError("Add the driver's name.");
    if (!Number.isInteger(Number(startKm)) || Number(startKm) < 0) return setError("Enter the starting kilometres.");
    for (const check of PRETRIP_CHECKS) {
      if (checks[check.key] == null) return setError(`Answer ${check.label}.`);
    }
    if (failed.length && faultNote.trim().length < 2) return setError("Describe the faults that failed the check.");
    for (const panel of PANEL_SIDES) {
      if (!panels[panel.key]) return setError(`Add a photo of the ${panel.label.toLowerCase()}.`);
    }
    if (!signature) return setError("The driver must sign the pre-trip.");
    await onSubmit({
      driverName: driverName.trim(),
      licenceNo: licenceNo.trim() || undefined,
      site: site.trim() || undefined,
      startKm: Number(startKm),
      checks: PRETRIP_CHECKS.map((check) => ({ key: check.key, pass: checks[check.key] === true })),
      faultNote: faultNote.trim() || undefined,
      photos: [
        ...PANEL_SIDES.map((panel) => ({ side: panel.key, dataUrl: panels[panel.key] as string })),
        ...damage.map((dataUrl) => ({ side: "damage", dataUrl })),
      ],
      driverSignature: signature,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {lastEndKm != null && <p className="text-sm text-muted-foreground">Last recorded {formatKm(lastEndKm)}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Driver"><Input value={driverName} onChange={(event) => setDriverName(event.target.value)} required /></Field>
        <Field label="Licence number"><Input value={licenceNo} onChange={(event) => setLicenceNo(event.target.value)} /></Field>
        <Field label="Starting kilometres"><Input type="number" min={0} step={1} value={startKm} onChange={(event) => setStartKm(event.target.value)} required /></Field>
        <Field label="Yard or site"><Input value={site} onChange={(event) => setSite(event.target.value)} /></Field>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Walk-around</p>
        {PRETRIP_CHECKS.map((check) => (
          <div key={check.key} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <span className="text-sm">{check.label}</span>
            <span className="flex gap-1">
              <Button type="button" size="sm" variant={checks[check.key] === true ? "default" : "outline"} onClick={() => setChecks((current) => ({ ...current, [check.key]: true }))}>Pass</Button>
              <Button type="button" size="sm" variant={checks[check.key] === false ? "destructive" : "outline"} onClick={() => setChecks((current) => ({ ...current, [check.key]: false }))}>Fail</Button>
            </span>
          </div>
        ))}
      </div>
      {failed.length > 0 && (
        <Field label="What failed">
          <textarea className={textareaClass} maxLength={2000} value={faultNote} onChange={(event) => setFaultNote(event.target.value)} required />
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {PANEL_SIDES.map((panel) => (
          <PhotoInput key={panel.key} label={`${panel.label} photo`} onChange={(dataUrl) => setPanels((current) => ({ ...current, [panel.key]: dataUrl }))} />
        ))}
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Extra damage photos</p>
        <PhotoList value={damage} onChange={setDamage} max={2} label="Add photo" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Driver signature</p>
        <p className="text-xs text-muted-foreground">The date and time are saved when this is signed.</p>
        <SignaturePad onChange={setSignature} height={130} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Sign and start"}</Button>
    </form>
  );
}

export function HandoverForm({
  minimumKm,
  busy,
  onSubmit,
}: {
  minimumKm: number;
  busy: boolean;
  onSubmit: (payload: HandoverPayload) => Promise<void>;
}) {
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [handoverKm, setHandoverKm] = useState(String(minimumKm));
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [fromSignature, setFromSignature] = useState<string | null>(null);
  const [toSignature, setToSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (fromName.trim().length < 2 || toName.trim().length < 2) return setError("Add both drivers' names.");
    if (!Number.isInteger(Number(handoverKm)) || Number(handoverKm) < minimumKm) return setError(`Handover km cannot be below ${formatKm(minimumKm)}.`);
    if (!fromSignature) return setError("The driver handing over must sign.");
    if (!toSignature) return setError("The driver taking over must sign.");
    await onSubmit({
      fromName: fromName.trim(),
      toName: toName.trim(),
      handoverKm: Number(handoverKm),
      note: note.trim() || undefined,
      fromSignature,
      toSignature,
      photos: photos.map((dataUrl) => ({ side: "damage", dataUrl })),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Driver handing over"><Input value={fromName} onChange={(event) => setFromName(event.target.value)} required /></Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Signature handing over</p>
        <SignaturePad onChange={setFromSignature} height={120} />
      </div>
      <Field label="Driver taking over"><Input value={toName} onChange={(event) => setToName(event.target.value)} required /></Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Signature taking over</p>
        <SignaturePad onChange={setToSignature} height={120} />
      </div>
      <Field label="Kilometres now"><Input type="number" min={minimumKm} step={1} value={handoverKm} onChange={(event) => setHandoverKm(event.target.value)} required /></Field>
      <Field label="Note"><textarea className={textareaClass} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Photos of damage at handover</p>
        <PhotoList value={photos} onChange={setPhotos} max={2} label="Add photo" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Sign the handover"}</Button>
    </form>
  );
}

export function CloseForm({
  minimumKm,
  busy,
  onSubmit,
}: {
  minimumKm: number;
  busy: boolean;
  onSubmit: (payload: ClosePayload) => Promise<void>;
}) {
  const [endDriverName, setEndDriverName] = useState("");
  const [endKm, setEndKm] = useState("");
  const [endNote, setEndNote] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (endDriverName.trim().length < 2) return setError("Add the name of the driver ending the trip.");
    if (!Number.isInteger(Number(endKm)) || Number(endKm) < minimumKm) return setError(`Ending km cannot be below ${formatKm(minimumKm)}.`);
    if (!signature) return setError("The driver ending the trip must sign.");
    await onSubmit({
      endDriverName: endDriverName.trim(),
      endKm: Number(endKm),
      endNote: endNote.trim() || undefined,
      endSignature: signature,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Driver ending the trip"><Input value={endDriverName} onChange={(event) => setEndDriverName(event.target.value)} required /></Field>
      <Field label="Ending kilometres"><Input type="number" min={minimumKm} step={1} value={endKm} onChange={(event) => setEndKm(event.target.value)} required /></Field>
      <Field label="Note"><textarea className={textareaClass} maxLength={2000} value={endNote} onChange={(event) => setEndNote(event.target.value)} /></Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Signature</p>
        <p className="text-xs text-muted-foreground">The end time is saved with this signature.</p>
        <SignaturePad onChange={setSignature} height={120} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Sign and end the trip"}</Button>
    </form>
  );
}
