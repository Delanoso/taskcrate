"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<any>(null);
  const [form, setForm] = useState({ fullName: "", registration: "", purpose: "", phone: "" });
  const [wa, setWa] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/modules/visitor/public/${token}`).then(r => r.json()).then(d => setSite(d.site));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/modules/visitor/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setWa(data.whatsAppUrl);
  }

  if (!site) return <p>Loading…</p>;
  if (wa) return (
    <div className="rounded-xl border bg-card p-6 text-center space-y-3">
      <h1 className="text-xl font-semibold">Checked in</h1>
      <p className="text-sm text-muted-foreground">Protocols queued to WhatsApp (delivery archived).</p>
      <Button asChild><a href={wa} target="_blank" rel="noreferrer">Open WhatsApp protocols</a></Button>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{site.companyName}</p>
      <h1 className="text-xl font-semibold">{site.name}</h1>
      <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
      <Input placeholder="Vehicle reg (optional)" value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
      <Input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required />
      <Input placeholder="WhatsApp number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
      <Button type="submit" className="w-full">Check in</Button>
    </form>
  );
}
