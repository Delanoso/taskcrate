"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";

function JobCardAdmin({ mode }: { mode: "internal" | "field" }) {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [machineRef, setMachineRef] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    setItems((await jsonFetch(`/api/modules/jobcard?mode=${mode}`)).items);
  }
  useEffect(() => { load().catch(console.error); }, [mode]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/jobcard", {
      method: "POST",
      body: JSON.stringify({ mode, title, machineRef }),
    });
    setTitle(""); setMachineRef("");
    load();
  }

  async function update(id: string, patch: Record<string, unknown>) {
    await jsonFetch("/api/modules/jobcard", {
      method: "PATCH",
      body: JSON.stringify({ id, mode, ...patch }),
    });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>New {mode} job card</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input placeholder="Title / fault" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input placeholder="Machine / site ref" value={machineRef} onChange={(e) => setMachineRef(e.target.value)} />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Queue</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="rounded-md border p-3 text-sm space-y-2">
              <div className="flex justify-between"><span className="font-medium">{i.title}</span><StatusBadge status={i.status} /></div>
              {i.machineRef && <p className="text-muted-foreground">{i.machineRef}</p>}
              <LinkBox url={`${appUrl}/p/jobcard/${i.publicToken}`} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => update(i.id, { status: "scheduled", mechanicName: "On duty" })}>Schedule</Button>
                <Button size="sm" variant="outline" onClick={() => update(i.id, { status: "in_progress" })}>Start</Button>
                {mode === "internal" && (
                  <Button size="sm" onClick={() => update(i.id, { status: "done", downtimeHours: 1, partsCost: 250 })}>Close + parts</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function JobCardInternalAdmin() {
  return <JobCardAdmin mode="internal" />;
}
export function JobCardFieldAdmin() {
  return <JobCardAdmin mode="field" />;
}
