"use client";

import { useState } from "react";
import { Button, Input } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { partyLabels, type StockKind } from "@/lib/modules/stock-shared";

const textareaClass = "min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type StockMovePayload = {
  kind: Exclude<StockKind, "legacy">;
  quantity?: number;
  counted?: number;
  partyName: string;
  partySignature: string;
  loggedByName: string;
  loggedBySignature: string;
  jobRef?: string;
  note?: string;
  reason?: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function StockMoveForm({
  kind,
  unit,
  loggerName,
  busy,
  onSubmit,
}: {
  kind: Exclude<StockKind, "legacy">;
  unit: string;
  loggerName: string;
  busy: boolean;
  onSubmit: (payload: StockMovePayload) => Promise<void>;
}) {
  const labels = partyLabels(kind);
  const [amount, setAmount] = useState(kind === "adjust" ? "" : "1");
  const [partyName, setPartyName] = useState("");
  const [loggedByName, setLoggedByName] = useState(loggerName);
  const [jobRef, setJobRef] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [partySignature, setPartySignature] = useState<string | null>(null);
  const [loggedSignature, setLoggedSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const quantity = Number(amount);
    if (kind === "adjust") {
      if (!Number.isInteger(quantity) || quantity < 0) {
        setError("Enter the quantity you counted.");
        return;
      }
    } else if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Enter the amount.");
      return;
    }
    if (partyName.trim().length < 2) {
      setError(`Add the name for ${labels.party.toLowerCase()}.`);
      return;
    }
    if (!partySignature) {
      setError(labels.partySign + ".");
      return;
    }
    if (loggedByName.trim().length < 2) {
      setError(`Add the name for ${labels.logged.toLowerCase()}.`);
      return;
    }
    if (!loggedSignature) {
      setError(labels.loggedSign + ".");
      return;
    }
    if (kind === "adjust" && reason.trim().length < 2) {
      setError("Add the reason for this stock count.");
      return;
    }
    await onSubmit({
      kind,
      ...(kind === "adjust" ? { counted: quantity } : { quantity }),
      partyName: partyName.trim(),
      partySignature,
      loggedByName: loggedByName.trim(),
      loggedBySignature: loggedSignature,
      jobRef: jobRef.trim() || undefined,
      note: note.trim() || undefined,
      reason: reason.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        <Field label={kind === "adjust" ? `Quantity counted (${unit})` : `Amount (${unit})`}>
          <Input type="number" min={kind === "adjust" ? 0 : 1} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </Field>
        <Field label={labels.party}>
          <Input value={partyName} onChange={(event) => setPartyName(event.target.value)} required />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{labels.partySign}</p>
          <SignaturePad onChange={setPartySignature} height={120} />
        </div>
        {kind !== "adjust" && (
          <Field label="Job, machine, or cost centre">
            <Input value={jobRef} onChange={(event) => setJobRef(event.target.value)} />
          </Field>
        )}
      </div>
      <div className="space-y-3">
        <Field label={labels.logged}>
          <Input value={loggedByName} onChange={(event) => setLoggedByName(event.target.value)} required />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{labels.loggedSign}</p>
          <SignaturePad onChange={setLoggedSignature} height={120} />
        </div>
        {kind === "adjust" ? (
          <Field label="Reason for the count">
            <textarea className={textareaClass} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} required />
          </Field>
        ) : (
          <Field label="Note">
            <textarea className={textareaClass} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        )}
      </div>
      {error && <p className="text-sm text-destructive lg:col-span-2">{error}</p>}
      <div className="lg:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : labels.title}</Button>
      </div>
    </form>
  );
}
