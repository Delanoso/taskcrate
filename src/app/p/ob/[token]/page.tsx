"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/modules/ui-bits";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await (await fetch(`/api/modules/ob/public/${token}`)).json();
    setSite(d.site);
  }
  useEffect(() => { load(); }, [token]);

  async function log(category: string) {
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
      );
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch {}
    const res = await fetch(`/api/modules/ob/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, notes, lat, lng }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setMsg(`Logged ${category} at ${new Date(data.timestamp).toLocaleTimeString()}`);
    setNotes("");
    load();
  }

  if (!site) return <p>Loading…</p>;
  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{site.companyName}</p>
      <h1 className="text-xl font-semibold">{site.name} OB</h1>
      {site.wakeDue && <p className="text-sm text-destructive">Wake-up window open — log an entry now.</p>}
      <textarea className="min-h-20 w-full rounded-md border p-2 text-sm" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="grid gap-2">
        {site.categories.map((c: string) => (
          <Button key={c} variant="outline" onClick={() => log(c)}>{c}</Button>
        ))}
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
