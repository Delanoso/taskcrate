"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/modules/ui-bits";
import { ReportForm, type ReportPayload } from "@/components/modules/nearmiss/report-form";

type Board = { companyName: string; locations: string[] };
type Sent = { reference: string; trackingUrl: string; at: string };

const STORE = "nearmiss-sent";

function savedReports(): Sent[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "[]");
    return Array.isArray(v) ? v.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [missing, setMissing] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [history, setHistory] = useState<Sent[]>([]);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    fetch(`/api/modules/nearmiss/public/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Board) => {
        setBoard(d);
        setHistory(savedReports());
      })
      .catch(() => setMissing(true));
  }, [token]);

  async function submit(payload: ReportPayload) {
    const res = await fetch(`/api/modules/nearmiss/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not send the report. Try again.");
    const entry: Sent = { reference: data.reference, trackingUrl: data.trackingUrl, at: new Date().toISOString() };
    const next = [entry, ...savedReports()].slice(0, 10);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
    setHistory(next);
    setSent(entry);
  }

  if (missing) return <Card><h1 className="text-xl font-semibold">This QR code is no longer active</h1><p className="mt-2 text-sm text-muted-foreground">Please tell your supervisor or safety officer.</p></Card>;
  if (!board) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (sent) {
    return (
      <Card>
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-12 text-green-600" />
          <h1 className="mt-2 text-xl font-semibold">Thank you — report received</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reference <strong>{sent.reference}</strong></p>
        </div>
        <p className="mt-4 text-sm">
          The safety team at {board.companyName} will look into it. You can check what is being done at any time on your private tracking page:
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button asChild><a href={sent.trackingUrl}>Track my report</a></Button>
          <Button variant="outline" onClick={() => { setSent(null); setFormKey((k) => k + 1); }}>Report something else</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">The tracking link is saved on this phone only. Nobody else can see who sent this report.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-muted-foreground">{board.companyName}</p>
        <h1 className="text-xl font-semibold">Report a near miss or hazard</h1>
        <p className="mt-2 flex items-start gap-2 rounded-md bg-green-50 p-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Anonymous by default. Your name, phone and device are not recorded unless you choose to add your name.
        </p>
        <div className="mt-4">
          <ReportForm key={formKey} locations={board.locations} anonymous submitLabel="Send report" onSubmit={submit} />
        </div>
      </Card>
      {history.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold">Reports sent from this phone</h2>
          <ul className="mt-2 divide-y text-sm">
            {history.map((h) => (
              <li key={h.trackingUrl} className="flex items-center justify-between py-2">
                <span>{h.reference} <span className="text-muted-foreground">· {new Date(h.at).toLocaleDateString("en-ZA")}</span></span>
                <a className="text-primary underline" href={h.trackingUrl}>Check progress</a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}
