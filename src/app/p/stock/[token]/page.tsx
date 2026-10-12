"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [item, setItem] = useState<any>(null);
  const [qty, setQty] = useState("1");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/modules/stock/public/${token}`).then(r => r.json()).then(d => setItem(d.item));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/modules/stock/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: Number(qty) }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setMsg(`Remaining ${data.quantity}`);
    setItem({ ...item, quantity: data.quantity });
  }

  if (!item) return <p>Loading…</p>;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{item.companyName}</p>
      <h1 className="text-xl font-semibold">Scan out — {item.name}</h1>
      <p className="text-sm">On hand: {item.quantity}</p>
      <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
      <Button type="submit" className="w-full">Scan out</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}
