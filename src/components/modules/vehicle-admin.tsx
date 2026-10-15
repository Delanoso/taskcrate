"use client";

import { useEffect, useState } from "react";
import { CloseForm, HandoverForm, PretripForm, type ClosePayload, type HandoverPayload, type PretripPayload } from "@/components/modules/pretrip-forms";
import { TripSheet } from "@/components/modules/pretrip-sheet";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LinkBox, jsonFetch } from "@/components/modules/ui-bits";
import { formatKm, formatWhen, type TripView } from "@/lib/modules/pretrip-shared";

type VehicleSummary = {
  id: string;
  name: string;
  regNumber: string;
  make: string | null;
  publicToken: string;
  latest: TripView | null;
};

type VehicleDetail = {
  id: string;
  name: string;
  regNumber: string;
  make: string | null;
  publicToken: string;
  trips: TripView[];
};

export function VehicleAdmin() {
  const [items, setItems] = useState<VehicleSummary[]>([]);
  const [selected, setSelected] = useState<VehicleDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch<{ items: VehicleSummary[] }>("/api/modules/vehicle");
    setItems(data.items);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load the fleet."));
  }, []);

  async function openVehicle(id: string) {
    setAdding(false);
    setError(null);
    const data = await jsonFetch<{ vehicle: VehicleDetail }>(`/api/modules/vehicle?id=${id}`);
    setSelected(data.vehicle);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each pre-trip keeps the photos, the driver’s signature, and the date and time. A handover is signed by both drivers. The trip stays open until the ending kilometres are signed.
        </p>
        <Button type="button" onClick={() => { setAdding(true); setSelected(null); }}>Add a vehicle</Button>
      </div>
      {error && !selected && <p className="text-sm text-destructive">{error}</p>}

      {adding && (
        <AddVehicle
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            load().catch(() => undefined);
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No vehicles yet.</p>}
        {items.map((vehicle) => (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => openVehicle(vehicle.id).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not open that vehicle."))}
            className={`rounded-xl border bg-card p-4 text-left hover:bg-muted ${selected?.id === vehicle.id ? "border-primary" : ""}`}
          >
            <span className="font-medium">{vehicle.name}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{vehicle.regNumber}{vehicle.make ? ` · ${vehicle.make}` : ""}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {vehicle.latest
                ? vehicle.latest.open
                  ? `On the road since ${formatWhen(vehicle.latest.startedAt)} · ${vehicle.latest.driverName}`
                  : `Last ended ${formatWhen(vehicle.latest.endedAt ?? vehicle.latest.startedAt)} · ${formatKm(vehicle.latest.endKm ?? vehicle.latest.startKm)}`
                : "No trips yet"}
            </span>
          </button>
        ))}
      </div>

      {selected && origin && (
        <VehicleDesk
          vehicle={selected}
          origin={origin}
          onBack={() => setSelected(null)}
          onChange={(vehicle) => {
            setSelected(vehicle);
            load().catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}

function AddVehicle({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [make, setMake] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await jsonFetch("/api/modules/vehicle", {
        method: "POST",
        body: JSON.stringify({ action: "create", name: name.trim(), regNumber: regNumber.trim(), make: make.trim() || undefined }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the vehicle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Add a vehicle</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Fleet name</span><Input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Bakkie 2" /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Registration</span><Input value={regNumber} onChange={(event) => setRegNumber(event.target.value)} required placeholder="CA 123-456" /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Make and model</span><Input value={make} onChange={(event) => setMake(event.target.value)} /></label>
          {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
          <div className="flex gap-2 sm:col-span-3">
            <Button type="submit" disabled={busy}>Add</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VehicleDesk({
  vehicle,
  origin,
  onBack,
  onChange,
}: {
  vehicle: VehicleDetail;
  origin: string;
  onBack: () => void;
  onChange: (vehicle: VehicleDetail) => void;
}) {
  const open = vehicle.trips.find((trip) => trip.open) ?? null;
  const [mode, setMode] = useState<"pretrip" | "handover" | "close" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const lastEnd = vehicle.trips.find((trip) => trip.endKm != null)?.endKm ?? null;

  async function send(action: string, payload: PretripPayload | HandoverPayload | ClosePayload) {
    setBusy(true);
    setError(null);
    try {
      await jsonFetch("/api/modules/vehicle", {
        method: "POST",
        body: JSON.stringify({ action, vehicleId: vehicle.id, ...payload }),
      });
      const data = await jsonFetch<{ vehicle: VehicleDetail }>(`/api/modules/vehicle?id=${vehicle.id}`);
      setMode(null);
      setFormKey((value) => value + 1);
      onChange(data.vehicle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back to the fleet</Button>
        <div className="flex flex-wrap gap-2">
          {!open && <Button type="button" onClick={() => setMode("pretrip")}>Log a pre-trip</Button>}
          {open && <Button type="button" variant="outline" onClick={() => setMode("handover")}>Hand over</Button>}
          {open && <Button type="button" onClick={() => setMode("close")}>End the trip</Button>}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>{vehicle.name} · {vehicle.regNumber}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {vehicle.make && <p className="text-muted-foreground">{vehicle.make}</p>}
          <p className="font-medium">Dash link</p>
          <LinkBox url={`${origin}/p/vehicle/${vehicle.publicToken}`} />
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={`/api/modules/vehicle/${vehicle.id}/pdf`} target="_blank" rel="noreferrer">Download the trip log</a>
          </Button>
        </CardContent>
      </Card>

      {mode === "pretrip" && (
        <Card>
          <CardHeader><CardTitle>Pre-trip</CardTitle></CardHeader>
          <CardContent>
            <PretripForm key={formKey} lastEndKm={lastEnd} busy={busy} onSubmit={(payload) => send("pretrip", payload)} />
          </CardContent>
        </Card>
      )}
      {mode === "handover" && open && (
        <Card>
          <CardHeader><CardTitle>Handover</CardTitle></CardHeader>
          <CardContent>
            <HandoverForm key={formKey} minimumKm={open.handoverKm ?? open.startKm} busy={busy} onSubmit={(payload) => send("handover", payload)} />
          </CardContent>
        </Card>
      )}
      {mode === "close" && open && (
        <Card>
          <CardHeader><CardTitle>End the trip</CardTitle></CardHeader>
          <CardContent>
            <CloseForm key={formKey} minimumKm={open.handoverKm ?? open.startKm} busy={busy} onSubmit={(payload) => send("close", payload)} />
          </CardContent>
        </Card>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {vehicle.trips.length === 0 && <p className="text-sm text-muted-foreground">No trips yet.</p>}
        {vehicle.trips.map((trip) => <TripSheet key={trip.id} trip={trip} />)}
      </div>
    </div>
  );
}
