"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export function LoanAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeName: "", employeeNumber: "", recordType: "loan", amount: "", description: "", repaymentNote: "", photoDataUrl: "" });
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() { setItems((await jsonFetch("/api/modules/loan")).items); }
  useEffect(() => { load().catch(console.error); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/loan", {
      method: "POST",
      body: JSON.stringify({
        employeeName: form.employeeName,
        employeeNumber: form.employeeNumber || undefined,
        recordType: form.recordType,
        amount: Number(form.amount),
        description: form.description,
        repaymentNote: form.repaymentNote || undefined,
        photoDataUrl: form.photoDataUrl || undefined,
      }),
    });
    setForm({ employeeName: "", employeeNumber: "", recordType: "loan", amount: "", description: "", repaymentNote: "", photoDataUrl: "" });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create AOD / deductible</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input placeholder="Employee" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required />
            <Input placeholder="Employee number" value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
              <option value="loan">Loan / advance (AOD)</option>
              <option value="deductible">Incident deductible</option>
            </select>
            <Input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <textarea className="min-h-20 w-full rounded-md border p-2 text-sm" placeholder="What the amount is for" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <textarea className="min-h-16 w-full rounded-md border p-2 text-sm" placeholder="How it comes off the payslip" value={form.repaymentNote} onChange={(e) => setForm({ ...form, repaymentNote: e.target.value })} />
            <PhotoInput label="Photo proof (optional)" onChange={(u) => setForm({ ...form, photoDataUrl: u ?? "" })} />
            <Button type="submit">Create signing link</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" asChild>
            <a href="/api/modules/loan/export">Download Excel</a>
          </Button>
          {items.map((i) => (
            <div key={i.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">{i.employeeName} · {i.amount}</span><StatusBadge status={i.status} /></div>
              <p className="text-muted-foreground">{i.recordType}: {i.description}</p>
              <a className="text-xs underline" href={`/api/modules/loan/${i.id}/pdf`} target="_blank" rel="noreferrer">Download PDF</a>
              <LinkBox url={`${appUrl}/p/loan/${i.publicToken}`} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
