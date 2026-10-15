"use client";

import { useState } from "react";
import { PhotoInput } from "@/components/modules/photo-input";
import { Button, Input } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { formatAmount } from "@/lib/modules/meter-shared";

const textareaClass = "min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type ReadingPayload = {
  reading: number;
  occupancy: number;
  readerName: string;
  readerSignature: string;
  photo: string;
  extraPhoto?: string;
  note?: string;
};

export type CheckPayload = {
  checkedByName: string;
  checkedSignature: string;
  checkNote: string;
  checkPhoto?: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function ReadingForm({
  unit,
  lastReading,
  busy,
  onSubmit,
}: {
  unit: string;
  lastReading: number | null;
  busy?: boolean;
  onSubmit: (payload: ReadingPayload) => void;
}) {
  const [reading, setReading] = useState("");
  const [occupancy, setOccupancy] = useState("0");
  const [readerName, setReaderName] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [extraPhoto, setExtraPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(reading);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter the number on the meter.");
      return;
    }
    if (lastReading != null && value + 0.0001 < lastReading) {
      setError(`This reading is below the last recorded ${formatAmount(lastReading, unit)}.`);
      return;
    }
    if (readerName.trim().length < 2) {
      setError("Add the name of the person who read the meter.");
      return;
    }
    if (!photo) {
      setError("Add a photo of the meter.");
      return;
    }
    if (!signature) {
      setError("The person who read the meter must sign.");
      return;
    }
    const people = Number(occupancy);
    if (!Number.isInteger(people) || people < 0) {
      setError("Occupancy must be a whole number.");
      return;
    }
    setError(null);
    onSubmit({
      reading: value,
      occupancy: people,
      readerName: readerName.trim(),
      readerSignature: signature,
      photo,
      extraPhoto: extraPhoto || undefined,
      note: note.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {lastReading != null && <p className="text-sm text-muted-foreground">Last recorded {formatAmount(lastReading, unit)}</p>}
      <Field label={`Reading (${unit})`}>
        <Input type="number" min={lastReading ?? 0} step="0.01" value={reading} onChange={(event) => setReading(event.target.value)} required />
      </Field>
      <Field label="Occupancy">
        <Input type="number" min={0} step={1} value={occupancy} onChange={(event) => setOccupancy(event.target.value)} />
      </Field>
      <Field label="Read by">
        <Input value={readerName} onChange={(event) => setReaderName(event.target.value)} required />
      </Field>
      <Field label="Note">
        <textarea className={textareaClass} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <PhotoInput label="Photo of the meter" onChange={setPhoto} />
      <PhotoInput label="Another photo" onChange={setExtraPhoto} />
      <div>
        <p className="mb-1 text-sm font-medium">Signature</p>
        <p className="mb-2 text-xs text-muted-foreground">The date and time are saved with this signature.</p>
        <SignaturePad onChange={setSignature} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Sign and save the reading"}</Button>
    </form>
  );
}

export function CheckForm({ busy, onSubmit }: { busy?: boolean; onSubmit: (payload: CheckPayload) => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Add the name of the person who checked the meter.");
      return;
    }
    if (note.trim().length < 2) {
      setError("Write what you found.");
      return;
    }
    if (!signature) {
      setError("The person who checked the meter must sign.");
      return;
    }
    setError(null);
    onSubmit({
      checkedByName: name.trim(),
      checkedSignature: signature,
      checkNote: note.trim(),
      checkPhoto: photo || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Checked by">
        <Input value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field label="What you found">
        <textarea className={textareaClass} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} required />
      </Field>
      <PhotoInput label="Photo of the check" onChange={setPhoto} />
      <div>
        <p className="mb-1 text-sm font-medium">Signature</p>
        <p className="mb-2 text-xs text-muted-foreground">The check time is saved with this signature.</p>
        <SignaturePad onChange={setSignature} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>Sign the check</Button>
    </form>
  );
}
