"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export function LoanAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeName: "", recordType: "loan", amount: "", description: "", photoDataUrl: "" });
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() { setItems((await jsonFetch("/api/modules/loan")).items); }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/loan", {
      method: "POST",
      body: JSON.stringify({
        employeeName: form.employeeName,
        recordType: form.recordType,
        amount: Number(form.amount),
        description: form.description,
        photoDataUrl: form.photoDataUrl || undefined,
      }),
    });
    setForm({ employeeName: "", recordType: "loan", amount: "", description: "", photoDataUrl: "" });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create AOD / deductible</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input placeholder="Employee" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required />
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
              <option value="loan">Loan / advance (AOD)</option>
              <option value="deductible">Incident deductible</option>
            </select>
            <Input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <textarea className="min-h-20 w-full rounded-md border p-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <PhotoInput label="Photo proof (optional)" onChange={(u) => setForm({ ...form, photoDataUrl: u ?? "" })} />
            <Button type="submit">Create signing link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Records</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">{i.employeeName} · {i.amount}</span><StatusBadge status={i.status} /></div>
              <p className="text-muted-foreground">{i.recordType}: {i.description}</p>
              <LinkBox url={`${appUrl}/p/loan/${i.publicToken}`} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
