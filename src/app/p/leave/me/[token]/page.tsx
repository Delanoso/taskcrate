"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/modules/ui-bits";
import { LeaveFields, LeaveStatus, SubmitButton, emptyLeaveForm, payload } from "@/components/modules/leave/request-form";
import { TRACKED_TYPES, fmtDays, fmtLeaveRange, leaveTypeLabel, type TypeBalance } from "@/lib/modules/leave-policy";

type Data = {
  companyName: string;
  workDays: string;
  employee: { fullName: string; level: string; annualDays: number };
  balances: Record<"annual" | "sick" | "family", TypeBalance>;
  requests: {
    id: string; leaveType: string; startDate: string; endDate: string; days: number | null;
    status: string; reason: string | null; decisionNote: string | null;
  }[];
};

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState(emptyLeaveForm);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      fetch(`/api/modules/leave/me/${token}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setData)
        .catch(() => setMissing(true)),
    [token],
  );
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/modules/leave/me/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(form)),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Something went wrong");
    setMessage(d.status === "pending" ? "Request sent — you'll get a WhatsApp message once it's been decided." : "Request submitted.");
    setForm(emptyLeaveForm());
    setShowForm(false);
    load();
  }

  async function withdraw(requestId: string) {
    const res = await fetch(`/api/modules/leave/me/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error ?? "Could not withdraw");
    setMessage("Request withdrawn.");
    load();
  }

  if (missing) return <p className="text-center text-sm text-muted-foreground">This leave link is not valid. Ask your manager for a new one.</p>;
  if (!data) return <p className="text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">{data.companyName}</p>
        <h1 className="text-xl font-semibold">{data.employee.fullName}</h1>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {TRACKED_TYPES.map((t) => (
            <div key={t} className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{data.balances[t].available}</p>
              <p className="text-xs text-muted-foreground">{leaveTypeLabel(t).replace(" leave", "")} days</p>
              {data.balances[t].pending > 0 && <p className="text-xs text-amber-700">{data.balances[t].pending} pending</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Annual leave grows by {data.balances.annual.monthlyAccrual} days each month ({data.employee.annualDays} a year).
        </p>
      </div>

      {message && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">{message}</p>}
      {error && !showForm && <p className="text-sm text-destructive">{error}</p>}

      {showForm ? (
        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Request leave</h2>
          <LeaveFields value={form} onChange={setForm} workDays={data.workDays} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <SubmitButton busy={busy}>Submit request</SubmitButton>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForm(false)}>Cancel</Button>
        </form>
      ) : (
        <Button className="w-full" onClick={() => { setShowForm(true); setMessage(null); setError(null); }}>Request leave</Button>
      )}

      <div className="space-y-2 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">My leave</h2>
        {data.requests.length === 0 && <p className="text-sm text-muted-foreground">No leave yet.</p>}
        {data.requests.map((r) => (
          <div key={r.id} className="space-y-1 rounded-md border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{leaveTypeLabel(r.leaveType)}</span>
              <LeaveStatus status={r.status} />
            </div>
            <p className="text-muted-foreground">
              {fmtLeaveRange(r.startDate, r.endDate)}{r.days ? ` · ${fmtDays(r.days)}` : ""}
            </p>
            {r.decisionNote && <p className="text-xs">Note: {r.decisionNote}</p>}
            {r.status === "pending" && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => withdraw(r.id)}>Withdraw request</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
