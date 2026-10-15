"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReadingForm, type ReadingPayload } from "@/components/modules/meter-forms";
import { ReadingSheet } from "@/components/modules/meter-sheet";
import { formatWhen, type ReadingView } from "@/lib/modules/meter-shared";

type SiteInfo = {
  name: string;
  typeLabel: string;
  meterNumber: string | null;
  location: string | null;
  unit: string;
  companyName: string;
  lastReading: string | null;
  lastValue: number | null;
  lastAt: string | null;
};

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [lastValue, setLastValue] = useState<number | null>(null);
  const [saved, setSaved] = useState<ReadingView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function load() {
    return fetch(`/api/modules/meter/public/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setMissing(true);
          return;
        }
        setSite(data.site);
        setLastValue(data.site.lastValue);
      })
      .catch(() => setMissing(true));
  }

  useEffect(() => {
    load().catch(() => setMissing(true));
  }, [token]);

  async function send(payload: ReadingPayload) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/meter/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that reading.");
      setSaved(data.reading);
      setLastValue(data.reading.reading);
      setFormKey((value) => value + 1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that reading.");
    } finally {
      setBusy(false);
    }
  }

  if (missing) return <p className="text-sm">This meter could not be found.</p>;
  if (!site) return <p className="text-sm text-muted-foreground">Loading meter…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{site.companyName}</p>
        <h1 className="text-xl font-semibold">{site.name}</h1>
        <p className="text-sm text-muted-foreground">
          {site.typeLabel}{site.meterNumber ? ` · ${site.meterNumber}` : ""}
        </p>
        {site.location && <p className="text-sm text-muted-foreground">{site.location}</p>}
        <p className="mt-1 text-sm">{site.lastReading ? `Last recorded ${site.lastReading}` : "No readings yet"}{site.lastAt ? ` · ${formatWhen(site.lastAt)}` : ""}</p>
      </div>

      {saved && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Saved {formatWhen(saved.createdAt)}.</p>
          {saved.alerted && <p className="text-sm font-medium text-destructive">This reading is above the baseline and needs a check.</p>}
          <ReadingSheet reading={saved} unit={site.unit} />
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <ReadingForm key={`${formKey}-${lastValue ?? "none"}`} unit={site.unit} lastReading={lastValue} busy={busy} onSubmit={send} />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
