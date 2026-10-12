"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";

export function OnboardAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() { setItems((await jsonFetch("/api/modules/onboard")).items); }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/onboard", { method: "POST", body: JSON.stringify({ employeeName, employeePhone }) });
    setEmployeeName(""); setEmployeePhone("");
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>New hire packet</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-2"><Label>Name</Label><Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Phone / WhatsApp</Label><Input value={employeePhone} onChange={(e) => setEmployeePhone(e.target.value)} /></div>
            <Button type="submit">Create secure link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Packets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">{i.employeeName}</span><StatusBadge status={i.status} /></div>
              <LinkBox url={`${appUrl}/p/onboard/${i.publicToken}`} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
