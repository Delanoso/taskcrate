"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { CONDITIONS, label, money } from "@/lib/modules/equipment-options";

type Batch = {
  company: string;
  documentNumber: string;
  employeeName: string;
  issuedBy: string | null;
  issuedAt: string;
  dueBackAt: string | null;
  accessories: string | null;
  notes: string | null;
  items: { name: string; assetTag: string | null; serialNumber: string | null; condition: string; value: number | null }[];
  terms: string[];
  status: "awaiting_signature" | "signed" | "cancelled";
  signedAt: string | null;
  signerName: string | null;
};

const api = (token: string, p = "") => `/api/modules/equipment/public/${token}${p}`;
const fmt = (iso: string, time = false) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleString("en-ZA", { day: "numeric", month: "long", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) });

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [b, setB] = useState<Batch | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetch(api(token))
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: Batch) => { setB(d); setName((n) => n || d.employeeName); })
        .catch(() => setMissing(true)),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <Box><h1 className="text-lg font-semibold">Link not available</h1><p className="mt-1 text-sm text-muted-foreground">This link is not valid. Please ask the person who issued the equipment.</p></Box>;
  if (!b) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function sign() {
    setBusy(true);
    setError(null);
    const res = await fetch(api(token), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signerName: name, agree, signature }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Something went wrong. Please try again.");
    load();
  }

  const header = (
    <>
      <p className="text-sm text-muted-foreground">{b.company} · {b.documentNumber}</p>
      <h1 className="text-xl font-semibold">Equipment custody</h1>
      <p className="mt-1 text-sm">Issued to <strong>{b.employeeName}</strong> on {fmt(b.issuedAt)}{b.issuedBy ? ` by ${b.issuedBy}` : ""}</p>
    </>
  );

  if (b.status === "cancelled") {
    return <Box>{header}<Notice good={false} icon={<XCircle className="size-5" />}>This issue was cancelled. You don&apos;t need to do anything.</Notice></Box>;
  }

  return (
    <div className="space-y-4">
      <Box>
        {header}
        <ul className="mt-4 divide-y rounded-md border">
          {b.items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-3 p-3 text-sm">
              <span>
                <span className="font-medium">{it.name}</span>
                <span className="block text-xs text-muted-foreground">{[it.assetTag, it.serialNumber && `S/N ${it.serialNumber}`, `${label(CONDITIONS, it.condition)} condition`].filter(Boolean).join(" · ")}</span>
              </span>
              {it.value != null && <span className="shrink-0 text-xs text-muted-foreground">{money(it.value)}</span>}
            </li>
          ))}
        </ul>
        {b.accessories && <p className="mt-2 text-sm">With: {b.accessories}</p>}
        {b.notes && <p className="mt-1 text-sm text-muted-foreground">{b.notes}</p>}
        <p className="mt-2 text-sm">{b.dueBackAt ? <>Return by <strong>{fmt(b.dueBackAt)}</strong>.</> : "Return on request or when your employment ends."}</p>
      </Box>

      {b.status === "signed" ? (
        <Box>
          <Notice good icon={<CheckCircle2 className="size-5" />}>Signed by {b.signerName} on {fmt(b.signedAt!, true)}. Thank you.</Notice>
          <Button asChild className="mt-4 w-full"><a href={api(token, "/pdf")} target="_blank" rel="noreferrer"><FileText className="size-4" />Download my copy</a></Button>
        </Box>
      ) : (
        <Box>
          <h2 className="font-semibold">Custody terms</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">{b.terms.map((t) => <li key={t}>{t}</li>)}</ol>
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="space-y-1.5"><Label htmlFor="eq-n">Full name</Label><Input id="eq-n" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I received the items listed above in the condition shown and accept the custody terms. I understand my electronic signature is binding.
            </label>
            <div className="space-y-1.5"><Label>Signature</Label><SignaturePad onChange={setSignature} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={busy || !agree || !signature || name.trim().length < 3} onClick={sign}>{busy ? "Signing…" : "Sign for custody"}</Button>
            <p className="text-center text-xs text-muted-foreground">Something wrong with the list? Don&apos;t sign. Contact {b.issuedBy ?? b.company} first.</p>
          </div>
        </Box>
      )}
    </div>
  );
}

function Notice({ icon, good, children }: { icon: React.ReactNode; good: boolean; children: React.ReactNode }) {
  return (
    <div className={`mt-4 flex items-start gap-2 rounded-md p-3 text-sm ${good ? "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200" : "bg-muted text-muted-foreground"}`}>
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}
