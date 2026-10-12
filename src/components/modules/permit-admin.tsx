"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  LinkBox,
  jsonFetch,
} from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import {
  labelKeys,
  parseJsonKeys,
  PERMIT_DEFAULT_DURATION_MS,
  PERMIT_HAZARDS,
  PERMIT_MAX_DURATION_MS,
  PERMIT_PPE,
  toDatetimeLocalValue,
} from "@/lib/modules/permit-options";

type Item = {
  id: string;
  title: string;
  status: string;
  publicToken: string;
  issuerName?: string | null;
  contractorName?: string | null;
  contractorPhone?: string | null;
  specificLocation?: string | null;
  equipmentId?: string | null;
  workDetails?: string | null;
  startAt?: string | null;
  expiresAt?: string | null;
  hazardsJson?: string | null;
  ppeJson?: string | null;
  completionNotes?: string | null;
  areaPhotoUrl?: string | null;
  equipmentPhotoUrl?: string | null;
  completionPhotoUrl?: string | null;
  preWorkReceiverSigUrl?: string | null;
  postWorkReceiverSigUrl?: string | null;
  documentNumber?: string | null;
  updatedAt?: string;
};

type SignMode = { id: string; status: "approved" | "closed" };

function downloadPdfBase64(base64: string, filename: string) {
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${base64}`;
  a.download = filename;
  a.click();
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function defaultWindow() {
  const start = new Date();
  start.setSeconds(0, 0);
  return {
    startAt: toDatetimeLocalValue(start),
    expiresAt: toDatetimeLocalValue(new Date(start.getTime() + PERMIT_DEFAULT_DURATION_MS)),
  };
}

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} title={alt} className="h-16 w-16 rounded border object-cover" />
  );
}

export function PermitAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState(() => ({
    title: "",
    issuerName: "",
    specificLocation: "",
    ...defaultWindow(),
  }));
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [signing, setSigning] = useState<SignMode | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    const data = await jsonFetch("/api/modules/permit");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load permits"));
    const id = window.setInterval(() => {
      load().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(id);
  }, [load]);

  const pending = items.filter((i) => i.status === "submitted");
  const readyToClose = items.filter((i) => i.status === "completed");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const start = new Date(draft.startAt);
    const end = new Date(draft.expiresAt);
    if (end <= start) return setError("Expiry must be after the start time.");
    if (end.getTime() - start.getTime() > PERMIT_MAX_DURATION_MS) {
      return setError("A general safety permit may not exceed 24 hours without renewal.");
    }
    try {
      const data = await jsonFetch("/api/modules/permit", {
        method: "POST",
        body: JSON.stringify({
          title: draft.title,
          issuerName: draft.issuerName,
          specificLocation: draft.specificLocation,
          startAt: start.toISOString(),
          expiresAt: end.toISOString(),
        }),
      });
      setCreatedUrl(`${appUrl}/p/permit/${data.item.publicToken}`);
      setDraft((d) => ({ ...d, title: "", specificLocation: "", ...defaultWindow() }));
      setMessage(`Permit ${data.item.documentNumber} created — share the link via WhatsApp.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create permit");
    }
  }

  function startSigning(mode: SignMode) {
    setSigning(mode);
    setSignature(null);
    setNotes("");
    setError(null);
  }

  async function confirmSigning() {
    if (!signing) return;
    if (!signature) return setError("The issuer must sign first.");
    const { id, status } = signing;
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const data = await jsonFetch("/api/modules/permit", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          status,
          managerNotes: notes || undefined,
          issuerSignatureDataUrl: signature,
        }),
      });
      if (status === "approved") {
        setMessage("Approved. The receiver signs the close-out on the same link when the job is done.");
      } else {
        const docNum = data.pdf?.documentNumber as string | undefined;
        if (data.pdfBytesBase64 && docNum) {
          downloadPdfBase64(data.pdfBytesBase64, `${docNum}.pdf`);
        }
        setMessage(
          docNum
            ? `Closed. PDF downloaded as ${docNum}. You can download it again anytime from this list.`
            : "Permit closed.",
        );
      }
      setSigning(null);
      setSignature(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <strong>{pending.length}</strong> permit{pending.length === 1 ? "" : "s"} waiting for
          your approval below.
        </div>
      )}
      {readyToClose.length > 0 && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
          Close-out signed by the receiver — countersign to close and file the PDF.
        </div>
      )}
      {message && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm">{message}</div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Send permit link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-2">
                <Label>Permit title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Replace conveyor motor belts"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Permit issuer</Label>
                <Input
                  value={draft.issuerName}
                  onChange={(e) => setDraft({ ...draft, issuerName: e.target.value })}
                  placeholder="Safety officer / manager authorising the work"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Specific location (optional)</Label>
                <Input
                  value={draft.specificLocation}
                  onChange={(e) => setDraft({ ...draft, specificLocation: e.target.value })}
                  placeholder="e.g. Warehouse B, Grid Line 4"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Input
                    type="datetime-local"
                    value={draft.startAt}
                    onChange={(e) => setDraft({ ...draft, startAt: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry time</Label>
                  <Input
                    type="datetime-local"
                    value={draft.expiresAt}
                    onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Permits should expire at end of shift and may not exceed 24 hours.
              </p>
              <Button type="submit">Create & get contractor link</Button>
              {createdUrl && <LinkBox url={createdUrl} />}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No permits yet. Create one to start.</p>
            )}
            {items.map((i) => {
              const publicUrl = `${appUrl}/p/permit/${i.publicToken}`;
              const hazards = labelKeys(parseJsonKeys(i.hazardsJson), PERMIT_HAZARDS);
              const ppe = labelKeys(parseJsonKeys(i.ppeJson), PERMIT_PPE);
              const isSigning = signing?.id === i.id;
              return (
                <div key={i.id} className="space-y-2 rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {i.documentNumber && (
                        <span className="mr-2 text-muted-foreground">{i.documentNumber}</span>
                      )}
                      {i.title}
                    </span>
                    <StatusBadge status={i.status} />
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {i.issuerName && (
                      <>
                        <dt>Issuer</dt>
                        <dd className="text-foreground">{i.issuerName}</dd>
                      </>
                    )}
                    {i.contractorName && (
                      <>
                        <dt>Receiver</dt>
                        <dd className="text-foreground">
                          {i.contractorName}
                          {i.contractorPhone ? ` · ${i.contractorPhone}` : ""}
                        </dd>
                      </>
                    )}
                    {i.specificLocation && (
                      <>
                        <dt>Location</dt>
                        <dd className="text-foreground">{i.specificLocation}</dd>
                      </>
                    )}
                    {i.equipmentId && (
                      <>
                        <dt>Equipment</dt>
                        <dd className="text-foreground">{i.equipmentId}</dd>
                      </>
                    )}
                    {i.startAt && (
                      <>
                        <dt>Window</dt>
                        <dd className="text-foreground">
                          {fmt(i.startAt)} → {fmt(i.expiresAt)}
                        </dd>
                      </>
                    )}
                    {i.workDetails && (
                      <>
                        <dt>Task</dt>
                        <dd className="text-foreground">{i.workDetails}</dd>
                      </>
                    )}
                    {hazards.length > 0 && (
                      <>
                        <dt>Hazards</dt>
                        <dd className="text-foreground">{hazards.join(", ")}</dd>
                      </>
                    )}
                    {ppe.length > 0 && (
                      <>
                        <dt>PPE</dt>
                        <dd className="text-foreground">{ppe.join(", ")}</dd>
                      </>
                    )}
                    {i.completionNotes && (
                      <>
                        <dt>Close-out</dt>
                        <dd className="text-foreground">{i.completionNotes}</dd>
                      </>
                    )}
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <Thumb src={i.areaPhotoUrl} alt="Work area" />
                    <Thumb src={i.equipmentPhotoUrl} alt="Safety equipment" />
                    <Thumb src={i.completionPhotoUrl} alt="Completion" />
                    <Thumb src={i.preWorkReceiverSigUrl} alt="Receiver pre-work signature" />
                    <Thumb src={i.postWorkReceiverSigUrl} alt="Receiver close-out signature" />
                  </div>
                  <LinkBox url={publicUrl} />

                  {isSigning ? (
                    <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                      <p className="font-medium">
                        {signing.status === "approved"
                          ? "Issuer pre-work signature"
                          : "Issuer close-out signature"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {signing.status === "approved"
                          ? "Sign to confirm you verified conditions on the ground and authorise the work."
                          : "Sign to confirm tools are cleared, the area is clean, and the machine is safe to restore."}
                      </p>
                      <SignaturePad onChange={setSignature} height={140} />
                      <Input
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busyId === i.id} onClick={confirmSigning}>
                          {busyId === i.id
                            ? "Saving…"
                            : signing.status === "approved"
                              ? "Sign & approve"
                              : "Sign, close + PDF"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === i.id}
                          onClick={() => setSigning(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {i.status === "submitted" && (
                        <Button size="sm" onClick={() => startSigning({ id: i.id, status: "approved" })}>
                          Approve
                        </Button>
                      )}
                      {i.status === "approved" && (
                        <Button size="sm" variant="outline" disabled>
                          Waiting for receiver close-out
                        </Button>
                      )}
                      {i.status === "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startSigning({ id: i.id, status: "closed" })}
                        >
                          Close + PDF
                        </Button>
                      )}
                      {i.status === "closed" && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/api/modules/permit/${i.id}/pdf`} target="_blank" rel="noreferrer">
                            {i.documentNumber ? `Download ${i.documentNumber}` : "Download PDF"}
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" asChild>
                        <a
                          href={`https://wa.me/${(i.contractorPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                            i.status === "approved"
                              ? `Your permit “${i.title}” is approved. When the job is done, sign the close-out here: ${publicUrl}`
                              : `Please complete this Permit to Work: ${publicUrl}`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
