"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { LeaveFields, LeaveStatus, emptyLeaveForm, payload, selectClass } from "@/components/modules/leave/request-form";
import { LEAVE_TYPES, fmtDays, fmtLeaveRange, isTracked, leaveTypeLabel } from "@/lib/modules/leave-policy";
import type { LeaveData, LeaveRequest, WaPrompt } from "@/components/modules/leave/types";

type Props = { data: LeaveData; reload: () => Promise<unknown>; onWhatsApp: (p: WaPrompt) => void };

const firstName = (name: string) => name.split(/\s+/)[0];

export function LeaveRequests({ data, reload, onWhatsApp }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [form, setForm] = useState(emptyLeaveForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const active = data.employees.filter((e) => e.active);
  const selected = active.find((e) => e.id === employeeId);
  const pending = data.requests.filter((r) => r.status === "pending" || r.status === "blocked");
  const history = data.requests
    .filter((r) => !(r.status === "pending" || r.status === "blocked"))
    .filter((r) => status === "all" || (status === "approved" ? r.status.endsWith("approved") : r.status === status))
    .filter((r) => type === "all" || r.leaveType === type)
    .filter((r) => !search || r.employeeName.toLowerCase().includes(search.toLowerCase()));

  async function record(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const d = await jsonFetch("/api/modules/leave/requests", {
        method: "POST",
        body: JSON.stringify({ employeeId, ...payload(form) }),
      });
      await reload();
      setForm(emptyLeaveForm());
      onWhatsApp({ text: `Leave recorded for ${selected?.fullName} (${fmtDays(d.request.days)}).`, url: d.whatsAppUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record leave");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Record leave</CardTitle>
            <CardDescription>Capture leave for an employee — it is approved straight away and deducted from their balance.</CardDescription>
          </CardHeader>
          <CardContent>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add employees first.</p>
            ) : (
              <form onSubmit={record} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="employee">Employee</Label>
                  <select id="employee" required className={selectClass} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                    <option value="">Choose…</option>
                    {active.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                  {selected && (
                    <p className="text-xs text-muted-foreground">
                      Annual {selected.balances.annual.available} · Sick {selected.balances.sick.available} · Family {selected.balances.family.available} days available
                    </p>
                  )}
                </div>
                <LeaveFields value={form} onChange={setForm} workDays={data.settings.workDays} />
                {selected && isTracked(form.leaveType) && selected.balances[form.leaveType].available <= 0 && (
                  <p className="text-xs text-amber-700">{firstName(selected.fullName)} has no {leaveTypeLabel(form.leaveType).toLowerCase()} left — the balance will go negative.</p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Record leave"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Waiting for approval ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
            {pending.map((r) => (
              <RequestRow key={r.id} r={r} data={data} reload={reload} onWhatsApp={onWhatsApp} decide />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Leave history</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder="Search employee" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="rejected">Declined</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All types</option>
                {LEAVE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            {history.length === 0 && <p className="text-sm text-muted-foreground">No leave found.</p>}
            {history.slice(0, 200).map((r) => (
              <RequestRow key={r.id} r={r} data={data} reload={reload} onWhatsApp={onWhatsApp} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RequestRow({ r, data, reload, onWhatsApp, decide }: Props & { r: LeaveRequest; decide?: boolean }) {
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emp = data.employees.find((e) => e.id === r.employeeId);
  const balance = emp && isTracked(r.leaveType) ? emp.balances[r.leaveType] : null;
  const name = firstName(r.employeeName);

  async function act(action: "approve" | "reject" | "cancel") {
    setBusy(true);
    setError(null);
    try {
      const d = await jsonFetch(`/api/modules/leave/requests/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      await reload();
      const verb = action === "approve" ? "approved" : action === "reject" ? "declined" : "cancelled";
      const returned = action === "cancel" && r.days && isTracked(r.leaveType) && r.status !== "pending" ? ` ${fmtDays(r.days)} added back.` : "";
      onWhatsApp({ text: `${r.employeeName}'s leave ${verb}.${returned} Let ${name} know:`, url: d.whatsAppUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await jsonFetch(`/api/modules/leave/requests/${r.id}`, { method: "DELETE" });
      await reload();
      const returned = r.days && isTracked(r.leaveType) && (r.status === "approved" || r.status === "auto_approved") ? ` ${fmtDays(r.days)} added back to ${name}'s balance.` : "";
      onWhatsApp({ text: `Leave deleted.${returned}`, url: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function resend() {
    try {
      const d = await jsonFetch(`/api/modules/leave/requests/${r.id}`);
      if (d.whatsAppUrl) window.open(d.whatsAppUrl, "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build message");
    }
  }

  const canCancel = ["pending", "approved", "auto_approved"].includes(r.status);
  const decided = ["approved", "auto_approved", "rejected", "cancelled"].includes(r.status);

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{r.employeeName}</p>
          <p className="text-muted-foreground">
            {leaveTypeLabel(r.leaveType)} · {fmtLeaveRange(r.startDate, r.endDate)}{r.days ? ` · ${fmtDays(r.days)}` : ""}
          </p>
        </div>
        <LeaveStatus status={r.status} />
      </div>
      {r.reason && <p className="text-xs">Reason: {r.reason}</p>}
      {r.decisionNote && <p className="text-xs">Note: {r.decisionNote}</p>}
      {(r.decidedBy || r.capturedBy) && (
        <p className="text-xs text-muted-foreground">
          {r.capturedBy ? `Recorded by ${r.capturedBy}` : `By ${r.decidedBy}`}
          {r.decidedAt ? ` · ${new Date(r.decidedAt).toLocaleDateString("en-ZA")}` : ""}
        </p>
      )}
      {decide && balance && (
        <p className={`text-xs ${balance.available - (r.days ?? 0) < 0 ? "text-red-700" : "text-muted-foreground"}`}>
          {name} has {fmtDays(balance.available)} {leaveTypeLabel(r.leaveType).toLowerCase()} — {fmtDays(balance.available - (r.days ?? 0))} left if approved.
        </p>
      )}
      {r.status === "blocked" && <p className="text-xs text-red-700">Blocked by a blackout date or level rule — you can still approve it.</p>}

      {decide && (
        <div className="space-y-2">
          <Input placeholder="Note to employee (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => act("approve")}>Approve</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act("reject")}>Decline</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {decided && r.employeeId && (
          <Button size="sm" variant="ghost" onClick={resend}>
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
        )}
        {confirm === "cancel" ? (
          <>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("cancel")}>Yes, cancel leave</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Keep</Button>
          </>
        ) : confirm === "delete" ? (
          <>
            <Button size="sm" variant="destructive" disabled={busy} onClick={remove}>Yes, delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Keep</Button>
          </>
        ) : (
          <>
            {canCancel && !decide && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm("cancel")}>Cancel leave</Button>
            )}
            {data.canDelete && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm("delete")}>Delete</Button>
            )}
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
