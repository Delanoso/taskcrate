"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatMoney } from "@/lib/modules/billing-shared";

type Line = { description: string; quantity: number; unit: string; unitPriceCents: number };
type Doc = {
  company: string;
  kind: string;
  number: string;
  status: string;
  clientName: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  totalCents: number;
  notes: string | null;
  lines: Line[];
};

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/modules/billing/public/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "This link is not active");
        setDoc(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "This link is not active"));
  }, [token]);

  if (!doc) return <main className="mx-auto max-w-lg p-6 text-sm">{error || "Loading…"}</main>;
  const kind = doc.kind === "QUOTE" ? "Quotation" : "Invoice";

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <div>
        <p className="text-sm text-muted-foreground">{doc.company}</p>
        <h1 className="text-2xl font-semibold">{kind} {doc.number}</h1>
        <p className="text-sm text-muted-foreground">For {doc.clientName} · issued {doc.issueDate}{doc.dueDate ? ` · due ${doc.dueDate}` : ""}</p>
      </div>
      <ul className="space-y-2 text-sm">
        {doc.lines.map((line) => (
          <li key={`${line.description}-${line.quantity}`} className="flex justify-between gap-3 border-b py-2">
            <span>{line.description} · {line.quantity} {line.unit}</span>
            <span>{formatMoney(Math.round(line.quantity * line.unitPriceCents), doc.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="text-lg font-semibold">Total {formatMoney(doc.totalCents, doc.currency)}</p>
      {doc.notes && <p className="text-sm text-muted-foreground">{doc.notes}</p>}
      <a className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href={`/api/modules/billing/public/${token}/pdf`}>Download PDF</a>
    </main>
  );
}
