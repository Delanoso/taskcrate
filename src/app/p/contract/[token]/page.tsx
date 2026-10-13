"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ExternalLink, FileText, ShieldCheck, XCircle } from "lucide-react";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import type { Block } from "@/lib/modules/contract-library";

type Doc = {
  company: string;
  reference: string | null;
  title: string;
  kind: "text" | "pdf";
  blocks: Block[];
  pageCount: number | null;
  contentHash: string | null;
  status: string;
  employeeName: string | null;
  dueDate: string | null;
  signedAt: string | null;
  signerName: string | null;
  requireCountersign: boolean;
  countersignedAt: string | null;
  declinedAt: string | null;
};

const api = (token: string, p = "") => `/api/modules/contract/public/${token}${p}`;
const fmt = (iso: string, time = false) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleString("en-ZA", { day: "numeric", month: "long", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) });

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(
    () =>
      fetch(api(token))
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setDoc)
        .catch(() => setMissing(true)),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <Box><h1 className="text-lg font-semibold">Document not available</h1><p className="mt-1 text-sm text-muted-foreground">This link is not valid. Please ask the person who sent it.</p></Box>;
  if (!doc) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const header = (
    <>
      <p className="text-sm text-muted-foreground">{doc.company}{doc.reference ? ` · ${doc.reference}` : ""}</p>
      <h1 className="text-xl font-semibold">{doc.title}</h1>
      {doc.employeeName && <p className="mt-1 text-sm">For: <strong>{doc.employeeName}</strong></p>}
    </>
  );

  if (doc.status === "voided") {
    return <Box>{header}<Notice icon={<XCircle className="size-5" />} tone="muted">This document has been withdrawn by {doc.company}. You don&apos;t need to do anything.</Notice></Box>;
  }
  if (doc.status === "declined") {
    return <Box>{header}<Notice icon={<XCircle className="size-5" />} tone="muted">You declined this document on {fmt(doc.declinedAt!, true)}. {doc.company} has been notified.</Notice></Box>;
  }
  if (doc.signedAt) {
    return (
      <Box>
        {header}
        <Notice icon={<CheckCircle2 className="size-5" />} tone="good">
          Signed by {doc.signerName} on {fmt(doc.signedAt, true)}.
          {doc.requireCountersign && !doc.countersignedAt ? ` ${doc.company} still needs to countersign; your copy will update when they do.` : " Thank you."}
        </Notice>
        <Button asChild className="mt-4 w-full">
          <a href={api(token, "/pdf")} target="_blank" rel="noreferrer"><FileText className="size-4" />Download my signed copy</a>
        </Button>
      </Box>
    );
  }
  return <SignView token={token} doc={doc} header={header} onDone={load} />;
}

function SignView({ token, doc, header, onDone }: { token: string; doc: Doc; header: React.ReactNode; onDone: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [readAll, setReadAll] = useState(false);
  const [name, setName] = useState(doc.employeeName ?? "");
  const [idNumber, setIdNumber] = useState("");
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const el = scroller.current;
    if (doc.kind === "text" && el && el.scrollHeight <= el.clientHeight + 8) setReadAll(true);
  }, [doc.kind]);

  function onScroll() {
    const el = scroller.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadAll(true);
  }

  async function post(path: string, body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(api(token, path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Something went wrong. Please try again.");
    onDone();
  }

  return (
    <div className="space-y-4">
      <Box>
        {header}
        {doc.dueDate && <p className="text-sm text-muted-foreground">Please sign by {fmt(doc.dueDate)}.</p>}
        {doc.kind === "text" ? (
          <>
            <div ref={scroller} onScroll={onScroll} className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto rounded-md border bg-background p-4 text-sm leading-relaxed">
              {doc.blocks.map((b, i) =>
                b.type === "heading" ? <h2 key={i} className="pt-2 font-semibold">{b.text}</h2>
                  : b.type === "bullet" ? <p key={i} className="flex gap-2 pl-2"><span>•</span><span>{b.text}</span></p>
                  : <p key={i}>{b.text}</p>,
              )}
            </div>
            {!readAll && <p className="mt-2 text-center text-xs text-muted-foreground">Scroll to the end of the document to sign.</p>}
          </>
        ) : (
          <div className="mt-4 space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
            <p>This document is a PDF{doc.pageCount ? ` of ${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}` : ""}. Open it and read every page before you sign.</p>
            <Button asChild variant="outline" className="w-full" onClick={() => setReadAll(true)}>
              <a href={api(token, "/source")} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open the document</a>
            </Button>
          </div>
        )}
        {doc.contentHash && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground" title={doc.contentHash}>
            <ShieldCheck className="size-3.5" />Document fingerprint {doc.contentHash.slice(0, 12)}…
          </p>
        )}
      </Box>

      <Box>
        {declining ? (
          <div className="space-y-3">
            <h2 className="font-semibold">Decline to sign</h2>
            <p className="text-sm text-muted-foreground">Tell {doc.company} why you are not signing. They will be notified.</p>
            <textarea className="min-h-24 w-full rounded-md border bg-background p-2 text-sm" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The salary in clause 3 is not what we agreed" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => post("/decline", { reason })}>{busy ? "Sending…" : "Decline"}</Button>
              <Button variant="ghost" onClick={() => { setDeclining(false); setError(null); }}>Back</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-semibold">Sign</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="cs-n">Full name</Label><Input id="cs-n" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
              <div className="space-y-1.5"><Label htmlFor="cs-id">ID or passport number (optional)</Label><Input id="cs-id" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} /></div>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I have read the whole document and agree to its terms. I understand that my electronic signature is legally binding.
            </label>
            <div className="space-y-1.5">
              <Label>Signature</Label>
              <SignaturePad onChange={setSignature} />
              <p className="text-xs text-muted-foreground">You sign once. Your signature is stamped on every page.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={busy || !readAll || !agree || !signature || name.trim().length < 3}
              onClick={() => post("", { signerName: name, idNumber: idNumber || null, agree, signature })}>
              {busy ? "Signing…" : !readAll ? (doc.kind === "pdf" ? "Open the document first" : "Read to the end first") : "Sign document"}
            </Button>
            <button type="button" className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setDeclining(true)}>I don&apos;t want to sign this</button>
          </div>
        )}
      </Box>
    </div>
  );
}

function Notice({ icon, tone, children }: { icon: React.ReactNode; tone: "good" | "muted"; children: React.ReactNode }) {
  return (
    <div className={`mt-4 flex items-start gap-2 rounded-md p-3 text-sm ${tone === "good" ? "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200" : "bg-muted text-muted-foreground"}`}>
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}
