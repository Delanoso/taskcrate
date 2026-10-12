"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, jsonFetch } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export function DisciplineAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeName: "", stage: "written", notes: "", incidentAt: "", photoDataUrl: "" });

  async function load() {
    setItems((await jsonFetch("/api/modules/discipline")).items);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/discipline", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        photoDataUrl: form.photoDataUrl || undefined,
      }),
    });
    setForm({ employeeName: "", stage: "written", notes: "", incidentAt: "", photoDataUrl: "" });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Log discipline event</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-2"><Label>Employee</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                <option value="verbal">Verbal</option>
                <option value="written">Written</option>
                <option value="final">Final</option>
                <option value="dismissal">Dismissal</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Back-dated incident time</Label><Input type="datetime-local" value={form.incidentAt} onChange={(e) => setForm({ ...form, incidentAt: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Notes</Label><textarea className="min-h-24 w-full rounded-md border p-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} required /></div>
            <PhotoInput label="Camera evidence" onChange={(u) => setForm({ ...form, photoDataUrl: u ?? "" })} />
            <Button type="submit">Save chronological entry</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Progressive log (oldest first)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {items.map((i) => (
            <div key={i.id} className="border-b py-2">
              <p className="font-medium">{i.employeeName} · {i.stage}</p>
              <p className="text-muted-foreground">{new Date(i.incidentAt).toLocaleString()}</p>
              <p>{i.notes}</p>
              {i.photoUrl && <a className="underline text-xs" href={i.photoUrl} target="_blank" rel="noreferrer">Evidence</a>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
