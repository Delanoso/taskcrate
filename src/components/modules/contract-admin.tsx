"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";

export function ContractAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("Employment Contract");
  const [bodyText, setBodyText] = useState("This agreement sets out the terms of employment...\n\nClause 1...\nClause 2...");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() { setItems((await jsonFetch("/api/modules/contract")).items); }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/contract", { method: "POST", body: JSON.stringify({ title, bodyText }) });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Send contract</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Contract / policy text</Label><textarea className="min-h-48 w-full rounded-md border p-2 text-sm" value={bodyText} onChange={(e) => setBodyText(e.target.value)} required /></div>
            <Button type="submit">Create signing link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">{i.title}</span><StatusBadge status={i.status} /></div>
              <LinkBox url={`${appUrl}/p/contract/${i.publicToken}`} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
