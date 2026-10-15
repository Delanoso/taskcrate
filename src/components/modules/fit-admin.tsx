"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";

export function FitAdmin() {
  const [sites, setSites] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("Main entrance");
  const [location, setLocation] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    setSites((await jsonFetch("/api/modules/fit")).sites);
    setLoaded(true);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/fit", { method: "POST", body: JSON.stringify({ name, location: location.trim() || undefined }) });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Fit-for-duty gate</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Gate name" />
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
            <Button type="submit">Create wall QR link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" asChild>
            <a href="/api/modules/fit/export">Download Excel</a>
          </Button>
          {loaded && sites.length === 0 && <p className="text-sm text-muted-foreground">No gates yet. Create one and it will show here.</p>}
          {sites.map((s) => {
            const url = `${appUrl}/p/fit/${s.publicToken}`;
            return (
            <div key={s.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{s.name}</p>
                <Button size="sm" variant="outline" asChild>
                  <a href={url}>Open gate</a>
                </Button>
              </div>
              <LinkBox url={url} />
              <ul className="mt-2 space-y-1">
                {(s.checks ?? []).slice(0, 10).map((c: any) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>{c.employeeName} · {new Date(c.createdAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "short", timeStyle: "short" })} · {c.reactionMs}ms</span>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
