"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";

type Mode = "in" | "out";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<any>(null);
  const [mode, setMode] = useState<Mode>("in");
  const [form, setForm] = useState({ fullName: "", registration: "", purpose: "", phone: "" });
  const [outPhone, setOutPhone] = useState("");
  const [wa, setWa] = useState<string | null>(null);
  const [leftName, setLeftName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/visitor/public/${token}`).then(r => r.json()).then(d => setSite(d.site));
  }, [token]);

  async function post(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/modules/visitor/public/${token}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return null;
    }
    return data;
  }

  async function checkIn(e: React.FormEvent) {
    e.preventDefault();
    const data = await post("", form);
    if (data) setWa(data.whatsAppUrl);
  }

  async function checkOut(e: React.FormEvent) {
    e.preventDefault();
    const data = await post("/checkout", { phone: outPhone });
    if (data) setLeftName(data.fullName);
  }

  if (!site) return <p>Loading…</p>;
  if (wa) return (
    <div className="rounded-xl border bg-card p-6 text-center space-y-3">
      <h1 className="text-xl font-semibold">Checked in</h1>
      <p className="text-sm text-muted-foreground">
        Open WhatsApp to receive the site protocols. The message includes a link to check out when you leave.
      </p>
      <Button asChild><a href={wa} target="_blank" rel="noreferrer">Open WhatsApp protocols</a></Button>
    </div>
  );
  if (leftName) return (
    <div className="rounded-xl border bg-card p-6 text-center space-y-2">
      <h1 className="text-xl font-semibold">Checked out</h1>
      <p className="text-sm text-muted-foreground">Thank you for visiting, {leftName}. Travel safely.</p>
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{site.companyName}</p>
      <h1 className="text-xl font-semibold">{site.name}</h1>
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {([["in", "Arriving"], ["out", "Leaving"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setMode(key); setError(null); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === key ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "in" ? (
        <form onSubmit={checkIn} className="space-y-3">
          <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input placeholder="Vehicle reg (optional)" value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
          <Input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required />
          <Input type="tel" placeholder="WhatsApp number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Checking in…" : "Check in"}</Button>
        </form>
      ) : (
        <form onSubmit={checkOut} className="space-y-3">
          <p className="text-sm text-muted-foreground">Enter the WhatsApp number you checked in with.</p>
          <Input type="tel" placeholder="WhatsApp number" value={outPhone} onChange={(e) => setOutPhone(e.target.value)} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Checking out…" : "Check out"}</Button>
        </form>
      )}
    </div>
  );
}
