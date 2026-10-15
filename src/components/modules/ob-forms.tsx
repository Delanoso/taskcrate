"use client";

import { useState } from "react";
import { PhotoInput } from "@/components/modules/photo-input";
import { Button, Input } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { OB_CATEGORIES, isHandover } from "@/lib/modules/ob-shared";

const textareaClass = "min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type ObPayload = {
  category: string;
  notes: string;
  people?: string;
  actionTaken?: string;
  guardName: string;
  guardSignature: string;
  photo: string;
  extraPhoto?: string;
  handoverToName?: string;
  handoverToSignature?: string;
  lat?: number;
  lng?: number;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

async function locate() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return {};
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 });
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return {};
  }
}

export function ObForm({ busy, onSubmit }: { busy?: boolean; onSubmit: (payload: ObPayload) => void }) {
  const [category, setCategory] = useState<string>(OB_CATEGORIES[0].label);
  const [notes, setNotes] = useState("");
  const [people, setPeople] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [guardName, setGuardName] = useState("");
  const [guardSignature, setGuardSignature] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [extraPhoto, setExtraPhoto] = useState<string | null>(null);
  const [handoverToName, setHandoverToName] = useState("");
  const [handoverToSignature, setHandoverToSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handover = isHandover(category);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (guardName.trim().length < 2) {
      setError("Add the guard's name.");
      return;
    }
    if (notes.trim().length < 2) {
      setError("Write what happened.");
      return;
    }
    if (!photo) {
      setError("Add a photo.");
      return;
    }
    if (!guardSignature) {
      setError("The guard must sign.");
      return;
    }
    if (handover && handoverToName.trim().length < 2) {
      setError("Add the name of the guard taking over.");
      return;
    }
    if (handover && !handoverToSignature) {
      setError("The guard taking over must sign.");
      return;
    }
    setError(null);
    const gps = await locate();
    onSubmit({
      category,
      notes: notes.trim(),
      people: people.trim() || undefined,
      actionTaken: actionTaken.trim() || undefined,
      guardName: guardName.trim(),
      guardSignature,
      photo,
      extraPhoto: extraPhoto || undefined,
      handoverToName: handover ? handoverToName.trim() : undefined,
      handoverToSignature: handover ? handoverToSignature || undefined : undefined,
      ...gps,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Category">
        <select className="h-9 w-full rounded-md border px-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
          {OB_CATEGORIES.map((item) => (
            <option key={item.key} value={item.label}>{item.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Guard filing this entry">
        <Input value={guardName} onChange={(event) => setGuardName(event.target.value)} required />
      </Field>
      <Field label="What happened">
        <textarea className={textareaClass} maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} required />
      </Field>
      <Field label="People involved">
        <Input value={people} onChange={(event) => setPeople(event.target.value)} />
      </Field>
      <Field label="Action taken">
        <textarea className={textareaClass} maxLength={2000} value={actionTaken} onChange={(event) => setActionTaken(event.target.value)} />
      </Field>
      <PhotoInput label="Photo" onChange={setPhoto} />
      <PhotoInput label="Another photo" onChange={setExtraPhoto} />
      <div>
        <p className="mb-1 text-sm font-medium">Signature</p>
        <p className="mb-2 text-xs text-muted-foreground">The time is saved with this signature. The entry cannot be changed afterwards.</p>
        <SignaturePad onChange={setGuardSignature} />
      </div>
      {handover && (
        <div className="space-y-3 rounded-lg border p-3">
          <Field label="Guard taking over">
            <Input value={handoverToName} onChange={(event) => setHandoverToName(event.target.value)} required />
          </Field>
          <div>
            <p className="mb-1 text-sm font-medium">Signature of the guard taking over</p>
            <SignaturePad onChange={setHandoverToSignature} />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Sign and file in the OB"}</Button>
    </form>
  );
}
