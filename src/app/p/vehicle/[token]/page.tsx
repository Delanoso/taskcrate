"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CloseForm, HandoverForm, PretripForm, type ClosePayload, type HandoverPayload, type PretripPayload } from "@/components/modules/pretrip-forms";
import { TripSheet } from "@/components/modules/pretrip-sheet";
import { Button } from "@/components/modules/ui-bits";
import { formatKm, formatWhen, paperStateLabel, type PaperState, type TripView } from "@/lib/modules/pretrip-shared";

type VehicleInfo = {
  name: string;
  regNumber: string;
  make: string | null;
  companyName: string;
  papers: { label: string; expiresOn: string | null; state: PaperState }[];
};

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [openTrip, setOpenTrip] = useState<TripView | null>(null);
  const [lastEndKm, setLastEndKm] = useState<number | null>(null);
  const [mode, setMode] = useState<"pretrip" | "handover" | "close">("pretrip");
  const [saved, setSaved] = useState<TripView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function load() {
    return fetch(`/api/modules/vehicle/public/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setMissing(true);
          return;
        }
        setVehicle(data.vehicle);
        setOpenTrip(data.openTrip);
        setLastEndKm(data.lastEndKm);
        setMode(data.openTrip ? "close" : "pretrip");
      })
      .catch(() => setMissing(true));
  }

  useEffect(() => {
    load().catch(() => setMissing(true));
  }, [token]);

  async function send(action: string, payload: PretripPayload | HandoverPayload | ClosePayload) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/vehicle/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that entry.");
      setSaved(data.trip);
      setFormKey((value) => value + 1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that entry.");
    } finally {
      setBusy(false);
    }
  }

  if (missing) return <p className="text-sm">This vehicle could not be found.</p>;
  if (!vehicle) return <p className="text-sm text-muted-foreground">Loading vehicle…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{vehicle.companyName}</p>
        <h1 className="text-xl font-semibold">{vehicle.name} · {vehicle.regNumber}</h1>
        {vehicle.make && <p className="text-sm text-muted-foreground">{vehicle.make}</p>}
        {lastEndKm != null && <p className="mt-1 text-sm">Last recorded {formatKm(lastEndKm)}</p>}
        <ul className="mt-2 space-y-1 text-sm">
          {vehicle.papers?.map((paper) => (
            <li key={paper.label}>
              {paper.label}: {paperStateLabel(paper.state)}{paper.expiresOn ? ` · ${paper.expiresOn}` : ""}
            </li>
          ))}
        </ul>
      </div>

      {saved && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Saved {saved.endedAt ? formatWhen(saved.endedAt) : saved.handoverAt ? formatWhen(saved.handoverAt) : formatWhen(saved.startedAt)}</p>
          {saved.varianceFlag && <p className="mt-1 text-destructive">The kilometres do not follow the last trip. A job card was opened.</p>}
          {saved.checks.some((check) => !check.pass) && <p className="mt-1 text-destructive">A failed check opened a job card.</p>}
        </div>
      )}

      {openTrip && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mode === "close" ? "default" : "outline"} onClick={() => setMode("close")}>End the trip</Button>
            <Button type="button" size="sm" variant={mode === "handover" ? "default" : "outline"} onClick={() => setMode("handover")}>Hand over</Button>
          </div>
          {mode === "handover" ? (
            <div className="rounded-xl border bg-card p-4">
              <HandoverForm key={formKey} minimumKm={openTrip.handoverKm ?? openTrip.startKm} busy={busy} onSubmit={(payload) => send("handover", payload)} />
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-4">
              <CloseForm key={formKey} minimumKm={openTrip.handoverKm ?? openTrip.startKm} busy={busy} onSubmit={(payload) => send("close", payload)} />
            </div>
          )}
          <TripSheet trip={openTrip} />
        </div>
      )}

      {!openTrip && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Pre-trip</h2>
          <PretripForm key={formKey} lastEndKm={lastEndKm} busy={busy} onSubmit={(payload) => send("pretrip", payload)} />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
