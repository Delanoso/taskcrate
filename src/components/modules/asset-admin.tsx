"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, jsonFetch } from "@/components/modules/ui-bits";

export function AssetAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    setItems((await jsonFetch("/api/modules/asset")).items);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/asset", { method: "POST", body: JSON.stringify({ name, assetCode }) });
    setName(""); setAssetCode("");
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Register machine</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Asset code</Label><Input value={assetCode} onChange={(e) => setAssetCode(e.target.value)} required /></div>
            <Button type="submit">Create QR link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{a.name} <span className="text-muted-foreground">({a.assetCode})</span></p>
              <LinkBox url={`${appUrl}/p/asset/${a.publicToken}`} />
              <p className="mt-1 text-xs text-muted-foreground">{a.checks?.length ?? 0} recent passes</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
