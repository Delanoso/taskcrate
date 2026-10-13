"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { Button, Label } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";

type Doc = {
  company: string;
  stage: "notice" | "outcome";
  reference: string;
  employeeName: string;
  offenceLabel: string;
  charge: string | null;
  incidentAt: string;
  location: string | null;
  hearing: { at: string; venue: string | null; chairperson: string | null } | null;
  rights: string[];
  noticeAcknowledgedAt: string | null;
  documentTitle: string;
  finding: string | null;
  sanctionLabel: string;
  sanction: string;
  sanctionDate: string | null;
  validUntil: string | null;
  reasons: string | null;
  issuedBy: string | null;
  signedAt: string | null;
  refusedToSign: boolean;
};

const fmt = (iso: string | null, time = false) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleString("en-ZA", {
        day: "numeric", month: "long", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "-";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [missing, setMissing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetch(`/api/modules/discipline/sign/${token}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setDoc)
        .catch(() => setMissing(true)),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <Box><h1 className="text-lg font-semibold">Document not available</h1><p className="mt-1 text-sm text-muted-foreground">This link is no longer valid. Please speak to your supervisor or HR.</p></Box>;
  if (!doc) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const isNotice = doc.stage === "notice";
  const done = isNotice ? !!doc.noticeAcknowledgedAt : !!doc.signedAt || doc.refusedToSign;
  const pdfHref = `/api/modules/discipline/sign/${token}/pdf${isNotice ? "?doc=notice" : ""}`;

  async function submit() {
    if (!signature) return setError("Please sign in the box first.");
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/modules/discipline/sign/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: doc!.stage, signature, comment: comment.trim() || null }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Could not save your signature");
    load();
  }

  return (
    <Box>
      <p className="text-sm text-muted-foreground">{doc.company} · {doc.reference}</p>
      <h1 className="text-xl font-semibold">{isNotice ? "Notice to attend a disciplinary hearing" : doc.documentTitle}</h1>
      <p className="mt-1 text-sm">To: <strong>{doc.employeeName}</strong></p>

      <section className="mt-4 space-y-1 rounded-md bg-muted/50 p-3 text-sm">
        <p className="font-medium">{isNotice ? "Allegation" : "Misconduct"}: {doc.offenceLabel}</p>
        {doc.charge && <p>{doc.charge}</p>}
        <p className="text-muted-foreground">Incident: {fmt(doc.incidentAt, true)}{doc.location ? ` · ${doc.location}` : ""}</p>
      </section>

      {isNotice && doc.hearing && (
        <>
          <section className="mt-4 rounded-md border p-3 text-sm">
            <p className="font-medium">Hearing</p>
            <p>{fmt(doc.hearing.at, true)}</p>
            <p>Venue: {doc.hearing.venue}</p>
            <p>Chairperson: {doc.hearing.chairperson}</p>
          </section>
          <section className="mt-4 text-sm">
            <p className="font-medium">Your rights</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">{doc.rights.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>
        </>
      )}

      {!isNotice && (
        <section className="mt-4 space-y-1 rounded-md border p-3 text-sm">
          <p><span className="text-muted-foreground">Finding:</span> {doc.finding === "not_guilty" ? "Not guilty" : "Guilty"}</p>
          <p><span className="text-muted-foreground">Outcome:</span> <strong>{doc.sanctionLabel}</strong></p>
          <p><span className="text-muted-foreground">Date:</span> {fmt(doc.sanctionDate)}</p>
          {doc.validUntil && <p><span className="text-muted-foreground">Valid until:</span> {fmt(doc.validUntil)}</p>}
          {doc.reasons && <p className="whitespace-pre-line pt-1">{doc.reasons}</p>}
          {doc.sanction === "dismissal" && (
            <p className="pt-1 text-xs text-muted-foreground">You may refer a dispute to the CCMA or bargaining council within 30 days of dismissal.</p>
          )}
          <p className="pt-1 text-xs text-muted-foreground">You may appeal in writing within 5 working days, stating your grounds.</p>
        </section>
      )}

      <Button asChild variant="outline" className="mt-4 w-full">
        <a href={pdfHref} target="_blank" rel="noreferrer"><FileText className="size-4" />Download PDF copy</a>
      </Button>

      {done ? (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">
          <CheckCircle2 className="size-5 shrink-0" />
          {doc.refusedToSign && !isNotice
            ? "This document was recorded as refused to sign, in front of a witness."
            : `Signed ${fmt(isNotice ? doc.noticeAcknowledgedAt : doc.signedAt, true)}. Thank you.`}
        </div>
      ) : (
        <section className="mt-5 space-y-3 border-t pt-4">
          <p className="text-sm">
            {isNotice
              ? "Please sign to confirm you received this notice. Signing does not mean you admit to the allegation."
              : "Please sign to confirm you received this document. Signing does not mean you agree with it."}
          </p>
          {!isNotice && (
            <div className="space-y-1.5">
              <Label htmlFor="cmt">Your comment (optional)</Label>
              <textarea id="cmt" className="min-h-20 w-full rounded-md border bg-background p-2 text-sm" maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anything you want recorded with this document" />
            </div>
          )}
          <SignaturePad onChange={setSignature} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Sign"}</Button>
        </section>
      )}
    </Box>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}
