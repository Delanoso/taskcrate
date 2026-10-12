"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [driverName, setDriverName] = useState("");
  const [startKm, setStartKm] = useState("");
  const [checks, setChecks] = useState<boolean[]>([]);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/modules/vehicle/public/${token}`).then(r => r.json()).then(d => {
      setVehicle(d.vehicle);
      setChecks(d.vehicle.checklist.map(() => false));
    });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/modules/vehicle/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverName,
        startKm: Number(startKm),
        checklist: checks,
        panelPhotos: photos.filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setResult(data);
  }

  if (!vehicle) return <p>Loading…</p>;
  if (result) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Pre-trip logged</h1>{result.varianceFlag && <p className="mt-2 text-sm text-destructive">Variance flagged — fleet notified & Job Card opened</p>}</div>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{vehicle.companyName}</p>
      <h1 className="text-xl font-semibold">{vehicle.name} · {vehicle.regNumber}</h1>
      <Input placeholder="Driver name" value={driverName} onChange={(e) => setDriverName(e.target.value)} required />
      <Input type="number" placeholder="Starting km" value={startKm} onChange={(e) => setStartKm(e.target.value)} required />
      {vehicle.checklist.map((c: string, i: number) => (
        <label key={c} className="flex gap-2 text-sm"><input type="checkbox" checked={checks[i]} onChange={(e) => { const n=[...checks]; n[i]=e.target.checked; setChecks(n); }} />{c}</label>
      ))}
      {["Front", "Rear", "Left", "Right"].map((label, i) => (
        <PhotoInput key={label} label={`${label} panel photo`} onChange={(u) => { const n=[...photos]; n[i]=u; setPhotos(n); }} />
      ))}
      <Button type="submit" className="w-full">Complete pre-trip / handover</Button>
    </form>
  );
}
