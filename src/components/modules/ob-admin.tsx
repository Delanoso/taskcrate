"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, LinkBox, jsonFetch } from "@/components/modules/ui-bits";

export function ObAdmin() {
  const [sites, setSites] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [guardPhone, setGuardPhone] = useState("");
  const [controlPhone, setControlPhone] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() { setSites((await jsonFetch("/api/modules/ob")).sites); }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/ob", {
      method: "POST",
      body: JSON.stringify({ name, guardPhone, controlPhone, wakeMinutes: 60 }),
    });
    setName(""); load();
  }

  async function wake(token: string) {
    const d = await jsonFetch(`/api/modules/ob/public/${token}`, { method: "PATCH", body: "{}" });
    if (d.guardWhatsApp) window.open(d.guardWhatsApp, "_blank");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>OB site</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input placeholder="Site name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Guard phone" value={guardPhone} onChange={(e) => setGuardPhone(e.target.value)} />
            <Input placeholder="Control room phone" value={controlPhone} onChange={(e) => setControlPhone(e.target.value)} />
            <Button type="submit">Create PWA link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sites & timeline</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sites.map((s) => (
            <div key={s.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{s.name}</p>
              <LinkBox url={`${appUrl}/p/ob/${s.publicToken}`} />
              <Button size="sm" variant="outline" className="mt-2" onClick={() => wake(s.publicToken)}>Run wake-up check</Button>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(s.entries ?? []).slice(0, 5).map((e: any) => (
                  <li key={e.id}>{new Date(e.createdAt).toLocaleString()} · {e.category} {e.lat != null ? `· GPS ${e.lat.toFixed(4)},${e.lng?.toFixed(4)}` : ""}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
