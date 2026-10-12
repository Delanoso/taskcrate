"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, jsonFetch } from "@/components/modules/ui-bits";

export function MeterAdmin() {
  const [sites, setSites] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [meterType, setMeterType] = useState("water");
  const [alertPhone, setAlertPhone] = useState("");
  const [readingForm, setReadingForm] = useState({ siteId: "", reading: "", occupancy: "0" });
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  async function load() { setSites((await jsonFetch("/api/modules/meter")).sites); }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/meter", {
      method: "POST",
      body: JSON.stringify({ action: "create_site", name, meterType, alertPhone }),
    });
    setName(""); load();
  }

  async function addReading(e: React.FormEvent) {
    e.preventDefault();
    const d = await jsonFetch("/api/modules/meter", {
      method: "POST",
      body: JSON.stringify({
        action: "reading",
        siteId: readingForm.siteId,
        reading: Number(readingForm.reading),
        occupancy: Number(readingForm.occupancy),
      }),
    });
    setLastAlert(d.alerted ? d.whatsAppUrl : null);
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Meter site</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input placeholder="Estate / unit meter" value={name} onChange={(e) => setName(e.target.value)} required />
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={meterType} onChange={(e) => setMeterType(e.target.value)}>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
            </select>
            <Input placeholder="Alert WhatsApp number" value={alertPhone} onChange={(e) => setAlertPhone(e.target.value)} />
            <Button type="submit">Add site</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Log weekly reading</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addReading} className="space-y-3">
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={readingForm.siteId} onChange={(e) => setReadingForm({ ...readingForm, siteId: e.target.value })} required>
              <option value="">Select site</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Input type="number" step="0.01" placeholder="Reading" value={readingForm.reading} onChange={(e) => setReadingForm({ ...readingForm, reading: e.target.value })} required />
            <Input type="number" placeholder="Occupancy" value={readingForm.occupancy} onChange={(e) => setReadingForm({ ...readingForm, occupancy: e.target.value })} />
            <Button type="submit">Save & check variance</Button>
            {lastAlert && <a className="block text-sm underline text-destructive" href={lastAlert} target="_blank" rel="noreferrer">Open emergency WhatsApp alert</a>}
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {sites.map((s) => (
              <div key={s.id} className="border-b py-2">
                <p className="font-medium">{s.name}</p>
                <p className="text-muted-foreground">{s.readings?.[0] ? `Last ${s.readings[0].reading}` : "No readings"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
