"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PhotoInput } from "@/components/modules/photo-input";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<{ name: string; location: string | null } | null>(null);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [fullName, setFullName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [note, setNote] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/attendance/public/${token}`)
      .then((res) => res.json())
      .then((data) => setSite(data.site ?? null))
      .catch(() => setError("This link is not active"));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo || !signature) {
      setError("Add a photo and a signature.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/modules/attendance/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, fullName, employeeNumber, note, overrideReason, photoDataUrl: photo, signatureDataUrl: signature }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save the clock entry");
      return;
    }
    setDone(`${fullName} clocked ${direction === "IN" ? "in" : "out"}.`);
    setFullName("");
    setEmployeeNumber("");
    setNote("");
    setPhoto(null);
    setSignature(null);
    setFormKey((key) => key + 1);
  }

  if (!site) return <main className="mx-auto max-w-md p-6 text-sm">{error || "Loading…"}</main>;

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div>
        <p className="text-sm text-muted-foreground">Site attendance</p>
        <h1 className="text-2xl font-semibold">{site.name}</h1>
        {site.location && <p className="text-sm text-muted-foreground">{site.location}</p>}
      </div>
      {done && <p className="text-sm text-green-700">{done}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={direction === "IN" ? "default" : "outline"} onClick={() => setDirection("IN")}>Clock in</Button>
          <Button type="button" variant={direction === "OUT" ? "default" : "outline"} onClick={() => setDirection("OUT")}>Clock out</Button>
        </div>
        <Label className="space-y-1">Full name<Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></Label>
        <Label className="space-y-1">Employee number<Input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} /></Label>
        <Label className="space-y-1">Note<Input value={note} onChange={(e) => setNote(e.target.value)} /></Label>
        {direction === "IN" && error?.startsWith("Stopped:") && (
          <Label className="space-y-1">Manager's reason to allow this clock-in
            <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Why this person may start" />
          </Label>
        )}
        <PhotoInput key={`photo-${formKey}`} label="Photo" onChange={setPhoto} capture="user" />
        <div>
          <p className="mb-1 text-sm font-medium">Signature</p>
          <SignaturePad key={`sign-${formKey}`} onChange={setSignature} />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : direction === "IN" ? "Clock in" : "Clock out"}</Button>
      </form>
    </main>
  );
}
