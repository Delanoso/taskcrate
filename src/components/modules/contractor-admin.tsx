"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";

export function ContractorAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    setItems((await jsonFetch("/api/modules/contractor")).items);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/contractor", { method: "POST", body: JSON.stringify({ companyName }) });
    setCompanyName("");
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Invite contractor</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-2"><Label>Company</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div>
            <Button type="submit">Create onboarding link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Safety files</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">{c.companyName}</span><StatusBadge status={c.status} /></div>
              <LinkBox url={`${appUrl}/p/contractor/${c.publicToken}`} />
              <p className="text-xs text-muted-foreground">{c.documents?.length ?? 0} documents</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
