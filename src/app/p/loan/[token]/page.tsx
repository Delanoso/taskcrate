"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { methodLabel, money, periodLabel } from "@/lib/modules/aod-options";

type Aod = {
  company: string;
  reference: string | null;
  employeeName: string;
  reasonText: string;
  kind: "loan" | "deductible";
  amount: number;
  description: string;
  instalmentAmount: number | null;
  instalments: number;
  firstPeriod: string | null;
  repayMethod: string;
  photos: string[];
  terms: string[];
  status: string;
  planReady: boolean;
  signedAt: string | null;
  signerName: string | null;
  paid: number;
  balance: number;
  schedule: { period: string; amount: number; state: string }[];
};

const api = (t: string, p = "") => `/api/modules/loan/public/${t}${p}`;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [a, setA] = useState<Aod | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [agree, setAgree] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () => fetch(api(token)).then((r) => (r.ok ? r.json() : Promise.reject())).then((d: Aod) => { setA(d); setName((n) => n || d.employeeName); }).catch(() => setMissing(true)),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function post(path: string, body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(api(token, path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Something went wrong. Please try again.");
    load();
  }

  if (missing) return <Box><h1 className="text-lg font-semibold">Link not available</h1><p className="mt-1 text-sm text-muted-foreground">This link is not valid. Please ask the person who sent it.</p></Box>;
  if (!a) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const header = (
    <>
      <p className="text-sm text-muted-foreground">{a.company}{a.reference ? ` · ${a.reference}` : ""}</p>
      <h1 className="text-xl font-semibold">Acknowledgement of debt</h1>
      <p className="mt-1 text-sm">For <strong>{a.employeeName}</strong></p>
    </>
  );

  if (a.status === "cancelled") return <Box>{header}<Notice good={false}>This acknowledgement was withdrawn by {a.company}. You don&apos;t need to do anything.</Notice></Box>;
  if (a.status === "declined") return <Box>{header}<Notice good={false}>You declined this acknowledgement. {a.company} has been told.</Notice></Box>;

  return (
    <div className="space-y-4">
      <Box>
        {header}
        <div className="mt-4 rounded-md border p-3">
          <p className="text-2xl font-semibold">{money(a.amount)}</p>
          <p className="text-sm font-medium">{a.reasonText}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.description}</p>
        </div>
        {a.instalmentAmount && a.firstPeriod && (
          <p className="mt-3 text-sm">Repaid in <strong>{a.instalments}</strong> monthly instalment{a.instalments === 1 ? "" : "s"} of <strong>{money(a.instalmentAmount)}</strong> by {methodLabel(a.repayMethod).toLowerCase()}, from {periodLabel(a.firstPeriod)}.</p>
        )}
        {a.photos.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{a.photos.length} photo{a.photos.length === 1 ? "" : "s"} attached as proof (included in your signed copy).</p>}
      </Box>

      {a.signedAt ? (
        <Box>
          <Notice good>Signed by {a.signerName} on {fmt(a.signedAt)}.</Notice>
          {(a.status === "active" || a.status === "settled") && (
            <p className="mt-3 text-sm">Paid so far: <strong>{money(a.paid)}</strong> · balance <strong>{money(a.balance)}</strong>{a.status === "settled" ? " · settled in full" : ""}</p>
          )}
          <Button asChild className="mt-4 w-full"><a href={api(token, "/pdf")} target="_blank" rel="noreferrer"><FileText className="size-4" />Download my copy and statement</a></Button>
        </Box>
      ) : !a.planReady ? (
        <Box><Notice good={false}>{a.company} still needs to finish the repayment plan. You will get a new message when it is ready to sign.</Notice></Box>
      ) : declining ? (
        <Box>
          <h2 className="font-semibold">Decline</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tell {a.company} why you do not agree. Nothing will be deducted.</p>
          <textarea className="mt-3 min-h-24 w-full rounded-md border bg-background p-2 text-sm" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I did not receive this amount / the damage was not my fault" />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => post("/decline", { reason })}>{busy ? "Sending…" : "Decline"}</Button>
            <Button variant="ghost" onClick={() => { setDeclining(false); setError(null); }}>Back</Button>
          </div>
        </Box>
      ) : (
        <Box>
          <h2 className="font-semibold">Read and sign</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">{a.terms.map((t) => <li key={t}>{t}</li>)}</ol>
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="a-n">Full name</Label><Input id="a-n" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
              <div className="space-y-1.5"><Label htmlFor="a-id">ID number (optional)</Label><Input id="a-id" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} /></div>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I have read this acknowledgement of debt, I agree with it, and I understand that my electronic signature is binding.
            </label>
            <div className="space-y-1.5"><Label>Signature</Label><SignaturePad onChange={setSig} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={busy || !agree || !sig || name.trim().length < 3} onClick={() => post("", { signerName: name, idNumber: idNumber || null, agree, signature: sig })}>{busy ? "Signing…" : "Sign"}</Button>
            <button type="button" className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setDeclining(true)}>I don&apos;t agree</button>
          </div>
        </Box>
      )}
    </div>
  );
}

function Notice({ good, children }: { good: boolean; children: React.ReactNode }) {
  return (
    <div className={`mt-4 flex items-start gap-2 rounded-md p-3 text-sm ${good ? "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200" : "bg-muted text-muted-foreground"}`}>
      {good ? <CheckCircle2 className="size-5 shrink-0" /> : <XCircle className="size-5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}
