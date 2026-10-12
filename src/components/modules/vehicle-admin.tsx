"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, LinkBox, jsonFetch } from "@/components/modules/ui-bits";

export function VehicleAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() { setItems((await jsonFetch("/api/modules/vehicle")).items); }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/vehicle", { method: "POST", body: JSON.stringify({ name, regNumber }) });
    setName(""); setRegNumber(""); load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Register vehicle</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input placeholder="Name / fleet ID" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Registration" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} required />
            <Button type="submit">Create dash QR link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Fleet</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((v) => (
            <div key={v.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{v.name} · {v.regNumber}</p>
              <LinkBox url={`${appUrl}/p/vehicle/${v.publicToken}`} />
              {(v.trips ?? []).filter((t: any) => t.varianceFlag).length > 0 && (
                <p className="text-xs text-destructive">Variance flagged — Job Card auto-created</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
