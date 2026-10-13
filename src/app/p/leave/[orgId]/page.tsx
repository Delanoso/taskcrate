"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input, Label } from "@/components/modules/ui-bits";
import { LeaveFields, STATUS_LABEL, SubmitButton, emptyLeaveForm, payload } from "@/components/modules/leave/request-form";
import { fmtDays } from "@/lib/modules/leave-policy";

export default function Page() {
  const { orgId } = useParams<{ orgId: string }>();
  const [meta, setMeta] = useState<{ companyName: string; workDays: string } | null>(null);
  const [missing, setMissing] = useState(false);
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState(emptyLeaveForm);
  const [done, setDone] = useState<{ status: string; days: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/leave/public/${orgId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMeta)
      .catch(() => setMissing(true));
  }, [orgId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/modules/leave/public/${orgId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, ...payload(form) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    setDone(data);
  }

  if (missing) return <p className="text-center text-sm text-muted-foreground">This leave link is not valid.</p>;
  if (!meta) return <p className="text-center text-sm text-muted-foreground">Loading…</p>;

  if (done) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{meta.companyName}</p>
        <h1 className="text-xl font-semibold">{STATUS_LABEL[done.status] ?? done.status}</h1>
        <p className="text-sm text-muted-foreground">
          Thanks {done.name.split(" ")[0]} — your request for {fmtDays(done.days)} has been received.
          {done.status === "pending" && " You'll get a WhatsApp message once your manager has decided."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">{meta.companyName}</p>
        <h1 className="text-xl font-semibold">Leave request</h1>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Your cellphone number</Label>
        <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 082 123 4567" />
        <p className="text-xs text-muted-foreground">The number your company has on the leave register.</p>
      </div>
      <LeaveFields value={form} onChange={setForm} workDays={meta.workDays} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <SubmitButton busy={busy}>Submit request</SubmitButton>
    </form>
  );
}
