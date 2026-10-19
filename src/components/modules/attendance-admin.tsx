"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, LinkBox, jsonFetch } from "@/components/modules/ui-bits";

type Punch = {
  id: string;
  direction: string;
  fullName: string;
  employeeNumber: string | null;
  note: string | null;
  when: string;
};
type Site = {
  id: string;
  name: string;
  location: string | null;
  publicToken: string;
  onSite: { fullName: string; employeeNumber: string | null; since: string }[];
  punches: Punch[];
};

export function AttendanceAdmin() {
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState({ name: "", location: "" });
  const [error, setError] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    setSites((await jsonFetch<{ sites: Site[] }>("/api/modules/attendance")).sites);
  }
  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load"));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await jsonFetch("/api/modules/attendance", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", location: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the site");
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add a site</CardTitle>
            <CardDescription>The gate link is where people clock in and out. The time is saved when they send it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3">
              <Label className="space-y-1">Site name<Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></Label>
              <Label className="space-y-1">Location<Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></Label>
              <Button type="submit">Save site</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Every clock-in and clock-out, with the name and the time.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild><a href="/api/modules/attendance/export">Download Excel</a></Button>
          </CardContent>
        </Card>
      </div>
      {sites.map((site) => (
        <Card key={site.id}>
          <CardHeader>
            <CardTitle>{site.name}</CardTitle>
            <CardDescription>{site.location || "No location yet"} · {site.onSite.length} on site now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <LinkBox url={`${origin}/p/attendance/${site.publicToken}`} />
            {site.onSite.length > 0 && (
              <p className="text-sm">On site: {site.onSite.map((person) => person.fullName).join(", ")}</p>
            )}
            {site.punches.slice(0, 12).map((punch) => (
              <div key={punch.id} className="rounded-md border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{punch.fullName} · {punch.direction === "IN" ? "In" : "Out"}</span>
                  <span className="text-muted-foreground">{punch.when}</span>
                </div>
                {punch.employeeNumber && <p className="text-muted-foreground">{punch.employeeNumber}</p>}
                {punch.note && <p>{punch.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
