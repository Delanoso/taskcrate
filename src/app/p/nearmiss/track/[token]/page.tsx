"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";

type Track = {
  companyName: string;
  reference: string;
  type: string;
  status: "open" | "triaged" | "closed";
  statusLabel: string;
  description: string;
  feedback: string | null;
  actionPlanned: boolean;
  createdAt: string;
  triagedAt: string | null;
  closedAt: string | null;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Track | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/nearmiss/track/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setMissing(true));
  }, [token]);

  if (missing) return <div className="rounded-xl border bg-card p-5"><h1 className="text-lg font-semibold">Report not found</h1><p className="mt-1 text-sm text-muted-foreground">It may have been removed by the safety team.</p></div>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const steps = [
    { label: "Received", done: true, at: data.createdAt },
    { label: "Being dealt with", done: data.status !== "open", at: data.triagedAt },
    { label: "Closed", done: data.status === "closed", at: data.closedAt },
  ];

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm text-muted-foreground">{data.companyName} · {data.type}</p>
        <h1 className="text-xl font-semibold">Report {data.reference}</h1>
      </div>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className={`flex size-7 items-center justify-center rounded-full border-2 ${s.done ? "border-green-600 bg-green-600 text-white" : "border-muted-foreground/30"}`}>
              {s.done && <Check className="size-4" />}
            </span>
            <span className={s.done ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
            {s.done && s.at && <span className="ml-auto text-xs text-muted-foreground">{fmt(s.at)}</span>}
          </li>
        ))}
      </ol>
      {data.feedback ? (
        <div className="rounded-md bg-primary/10 p-3 text-sm">
          <p className="font-medium">Message from the safety team</p>
          <p className="mt-1 whitespace-pre-line">{data.feedback}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {data.status === "open" ? "The safety team has not looked at this yet." : data.actionPlanned ? "Corrective action has been planned." : "The safety team is looking into it."}
        </p>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">What you reported</summary>
        <p className="mt-2 whitespace-pre-line">{data.description}</p>
      </details>
      <p className="text-xs text-muted-foreground">Keep this link private — anyone with it can see this page.</p>
    </div>
  );
}
