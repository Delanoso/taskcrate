"use client";

import { useEffect, useState } from "react";
import { Button, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, jsonFetch } from "@/components/modules/ui-bits";

export function VisitorAdmin() {
  const [site, setSite] = useState<any>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [protocol, setProtocol] = useState("");

  async function load() {
    const data = await jsonFetch("/api/modules/visitor");
    setSite(data.site);
    setPublicUrl(data.publicUrl);
    setProtocol(data.site.protocolText);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function save() {
    await jsonFetch("/api/modules/visitor", {
      method: "PATCH",
      body: JSON.stringify({ protocolText: protocol }),
    });
    load();
  }

  if (!site) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{site.name} QR / link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <LinkBox url={publicUrl} />
          <p className="text-sm text-muted-foreground">Print this as a static QR at the gate.</p>
          <div className="space-y-2">
            <Label>Protocol text pushed via WhatsApp</Label>
            <textarea className="min-h-40 w-full rounded-md border p-3 text-sm" value={protocol} onChange={(e) => setProtocol(e.target.value)} />
          </div>
          <Button onClick={save}>Save protocol</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Visitor ledger</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(site.visitors ?? []).map((v: any) => (
            <div key={v.id} className="border-b py-2">
              <p className="font-medium">{v.fullName}</p>
              <p className="text-muted-foreground">{v.purpose} · {v.phone}</p>
              <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
