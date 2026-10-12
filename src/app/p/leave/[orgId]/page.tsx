"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";

export default function Page() {
  const { orgId } = useParams<{ orgId: string }>();
  const [meta, setMeta] = useState<any>(null);
  const [form, setForm] = useState({ employeeName: "", employeeLevel: "", startDate: "", endDate: "", reason: "" });
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/modules/leave/public/${orgId}`).then(r => r.json()).then(d => {
      setMeta(d);
      setForm(f => ({ ...f, employeeLevel: d.levels?.[0] || "Staff" }));
    });
  }, [orgId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/modules/leave/public/${orgId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setStatus(data.status);
  }

  if (!meta) return <p>Loading…</p>;
  if (status) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Request {status.replace(/_/g," ")}</h1></div>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{meta.companyName}</p>
      <h1 className="text-xl font-semibold">Leave request</h1>
      <Input placeholder="Your name" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required />
      <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.employeeLevel} onChange={(e) => setForm({ ...form, employeeLevel: e.target.value })}>
        {(meta.levels?.length ? meta.levels : ["Staff"]).map((l: string) => <option key={l}>{l}</option>)}
      </select>
      <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
      <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
      <Input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      <Button type="submit" className="w-full">Submit</Button>
    </form>
  );
}
