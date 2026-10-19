"use client";

import { useEffect, useState } from "react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Bill = { id: string; supplierName: string; reference: string | null; amountCents: number; dueOn: string; status: string; note: string | null; paidOn: string | null; photoUrl: string | null };

const rands = (cents: number) => `R ${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BillsAdmin() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [form, setForm] = useState({ supplierName: "", reference: "", amount: "", dueOn: "", note: "", photoDataUrl: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch<{ bills: Bill[] }>("/api/modules/bills");
    setBills(data.bills);
  }

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : "Could not load")); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await jsonFetch("/api/modules/bills", {
        method: "POST",
        body: JSON.stringify({
          supplierName: form.supplierName,
          reference: form.reference,
          amount: Number(form.amount),
          dueOn: form.dueOn,
          note: form.note,
          ...(form.photoDataUrl ? { photoDataUrl: form.photoDataUrl } : {}),
        }),
      });
      setForm({ supplierName: "", reference: "", amount: "", dueOn: "", note: "", photoDataUrl: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  function readPhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, photoDataUrl: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  }

  const open = bills.filter((bill) => bill.status !== "paid");
  const paid = bills.filter((bill) => bill.status === "paid");

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>Add a supplier bill</CardTitle>
          <CardDescription>It stays on the morning email until it is marked paid.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Label className="space-y-1">Supplier<Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} required /></Label>
            <Label className="space-y-1">Their reference<Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Label>
            <Label className="space-y-1">Amount (R)<Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Label>
            <Label className="space-y-1">Due<Input type="date" value={form.dueOn} onChange={(e) => setForm({ ...form, dueOn: e.target.value })} required /></Label>
            <Label className="space-y-1 sm:col-span-2">Note<Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Label>
            <label className="text-sm sm:col-span-2">Photo of the invoice<input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => readPhoto(e.target.files?.[0])} /></label>
            <Button type="submit">Save bill</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Open</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {open.length === 0 && <p className="text-sm text-muted-foreground">No open bills.</p>}
          {open.map((bill) => (
            <div key={bill.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <span>{bill.supplierName} · {rands(bill.amountCents)} · due {bill.dueOn}{bill.reference ? ` · ${bill.reference}` : ""}</span>
              <Button size="sm" variant="outline" onClick={() => jsonFetch("/api/modules/bills", { method: "POST", body: JSON.stringify({ action: "paid", id: bill.id, paid: true }) }).then(load).catch((err) => setError(err instanceof Error ? err.message : "Could not update"))}>Mark paid</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      {paid.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Paid</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {paid.map((bill) => (
              <p key={bill.id} className="text-sm text-muted-foreground">{bill.supplierName} · {rands(bill.amountCents)} · paid {bill.paidOn}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
