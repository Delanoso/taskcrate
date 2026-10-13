"use client";

import { useState } from "react";
import { Download, FileUp, MessageCircle, Plus } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, LinkBox, jsonFetch } from "@/components/modules/ui-bits";
import { LeaveStatus, selectClass } from "@/components/modules/leave/request-form";
import { DEFAULT_MONTHLY_ACCRUAL, IMPORT_COLUMNS, parseEmployeeRows, textToRows, type ImportResult } from "@/components/modules/leave/import";
import { readXlsx } from "@/lib/xlsx-read";
import { fmtDays, fmtLeaveRange, leaveTypeLabel, todayKey, waPhone } from "@/lib/modules/leave-policy";
import type { Employee, LeaveData, WaPrompt } from "@/components/modules/leave/types";

type Props = { data: LeaveData; reload: () => Promise<unknown>; onWhatsApp: (p: WaPrompt) => void };
type Panel = { kind: "detail"; id: string } | { kind: "add" } | { kind: "edit"; id: string } | { kind: "import" } | null;

const dateOnly = (iso: string) => iso.slice(0, 10);

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function LeaveEmployees({ data, reload, onWhatsApp }: Props) {
  const [panel, setPanel] = useState<Panel>(data.employees.length ? null : { kind: "import" });
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const list = data.employees
    .filter((e) => showArchived || e.active)
    .filter((e) => !search || `${e.fullName} ${e.employeeNumber ?? ""} ${e.level}`.toLowerCase().includes(search.toLowerCase()));
  const current = panel && "id" in panel ? data.employees.find((e) => e.id === panel.id) : undefined;

  function exportCsv() {
    const header = ["Name", "Employee number", "Cellphone", "Level", "Start date", "Days added per month", "Annual available", "Annual pending", "Sick available", "Family available", "Active"];
    const rows = data.employees.map((e) => [
      e.fullName, e.employeeNumber, e.phone, e.level, dateOnly(e.startDate), e.balances.annual.monthlyAccrual,
      e.balances.annual.available, e.balances.annual.pending, e.balances.sick.available, e.balances.family.available, e.active ? "Yes" : "No",
    ]);
    download(`leave-balances-${todayKey()}.csv`, [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n"));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Employees ({data.employees.filter((e) => e.active).length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setPanel({ kind: "add" })}><Plus className="size-4" /> Add</Button>
              <Button size="sm" variant="outline" onClick={() => setPanel({ kind: "import" })}><FileUp className="size-4" /> Import</Button>
              {data.employees.length > 0 && (
                <Button size="sm" variant="outline" onClick={exportCsv}><Download className="size-4" /> Export</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.employees.length > 0 && (
            <div className="flex items-center gap-3">
              <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
              </label>
            </div>
          )}
          {data.employees.length === 0 && <p className="text-sm text-muted-foreground">No employees yet — add them one by one or import your list.</p>}
          {list.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Employee</th>
                    <th className="px-2 py-2 text-right font-medium">Annual</th>
                    <th className="px-2 py-2 text-right font-medium">Sick</th>
                    <th className="px-2 py-2 text-right font-medium">Family</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setPanel({ kind: "detail", id: e.id })}
                      className={`cursor-pointer border-b last:border-0 hover:bg-muted/50 ${current?.id === e.id ? "bg-muted" : ""} ${e.active ? "" : "opacity-50"}`}
                    >
                      <td className="py-2 pr-2">
                        <p className="font-medium">{e.fullName}</p>
                        <p className="text-xs text-muted-foreground">{[e.employeeNumber, e.level, e.active ? null : "Archived"].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${e.balances.annual.available < 0 ? "text-red-700" : ""}`}>
                        {e.balances.annual.available}
                        {e.balances.annual.pending > 0 && <span className="block text-xs font-normal text-amber-700">{e.balances.annual.pending} pending</span>}
                      </td>
                      <td className="px-2 py-2 text-right">{e.balances.sick.available}</td>
                      <td className="px-2 py-2 text-right">{e.balances.family.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="self-start">
        {panel?.kind === "add" && <EmployeeForm data={data} onDone={async (id) => { await reload(); setPanel(id ? { kind: "detail", id } : null); }} />}
        {panel?.kind === "edit" && current && (
          <EmployeeForm data={data} employee={current} onDone={async () => { await reload(); setPanel({ kind: "detail", id: current.id }); }} />
        )}
        {panel?.kind === "import" && <ImportPanel onDone={async () => { await reload(); }} />}
        {panel?.kind === "detail" && current && (
          <EmployeeDetail
            employee={current}
            data={data}
            reload={reload}
            onWhatsApp={onWhatsApp}
            onEdit={() => setPanel({ kind: "edit", id: current.id })}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </div>
  );
}

function EmployeeForm({ data, employee, onDone }: { data: LeaveData; employee?: Employee; onDone: (id?: string) => Promise<void> }) {
  const [f, setF] = useState(() => ({
    fullName: employee?.fullName ?? "",
    employeeNumber: employee?.employeeNumber ?? "",
    phone: employee?.phone ?? "",
    level: employee?.level ?? data.rules[0]?.levelName ?? "Staff",
    startDate: employee ? dateOnly(employee.startDate) : "",
    monthlyAccrual: String(employee ? Math.round((employee.annualDays / 12) * 10000) / 10000 : DEFAULT_MONTHLY_ACCRUAL),
    balanceDate: employee ? dateOnly(employee.balanceDate) : todayKey(),
    openingAnnual: String(employee?.openingAnnual ?? 0),
    openingSick: employee?.openingSick?.toString() ?? "",
    openingFamily: employee?.openingFamily?.toString() ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const levels = [...new Set([...data.rules.map((r) => r.levelName), ...data.employees.map((e) => e.level), "Staff"])];
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const d = await jsonFetch(employee ? `/api/modules/leave/employees/${employee.id}` : "/api/modules/leave/employees", {
        method: employee ? "PATCH" : "POST",
        body: JSON.stringify({ ...f, annualDays: Math.round(Number(f.monthlyAccrual) * 12 * 10000) / 10000 }),
      });
      await onDone(d.employee?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{employee ? `Edit ${employee.fullName}` : "Add employee"}</CardTitle>
        <CardDescription>Balances are worked out from the opening balance on the balance date, plus monthly accrual, minus approved leave.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="fullName">Full name</Label><Input id="fullName" required value={f.fullName} onChange={set("fullName")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="employeeNumber">Employee number</Label><Input id="employeeNumber" value={f.employeeNumber} onChange={set("employeeNumber")} /></div>
            <div className="space-y-1.5"><Label htmlFor="phone">Cellphone (WhatsApp)</Label><Input id="phone" type="tel" value={f.phone} onChange={set("phone")} placeholder="082 123 4567" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="level">Level</Label>
              <Input id="level" list="leave-levels" required value={f.level} onChange={set("level")} />
              <datalist id="leave-levels">{levels.map((l) => <option key={l} value={l} />)}</datalist>
            </div>
            <div className="space-y-1.5"><Label htmlFor="startDate">Employment start date</Label><Input id="startDate" type="date" required value={f.startDate} onChange={set("startDate")} /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="monthlyAccrual">Annual leave days added per month</Label>
            <Input id="monthlyAccrual" type="number" min={0} max={5} step="any" required value={f.monthlyAccrual} onChange={set("monthlyAccrual")} />
            <p className="text-xs text-muted-foreground">
              {Number(f.monthlyAccrual) > 0 ? `= ${Math.round(Number(f.monthlyAccrual) * 12 * 100) / 100} days a year. ` : ""}
              BCEA minimum is 1.25 a month (15 days a year on a 5-day week).
            </p>
          </div>
          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium">Opening balances</legend>
            <div className="space-y-1.5"><Label htmlFor="balanceDate">Balances as at</Label><Input id="balanceDate" type="date" required value={f.balanceDate} onChange={set("balanceDate")} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label htmlFor="openingAnnual">Annual</Label><Input id="openingAnnual" type="number" step="0.01" required value={f.openingAnnual} onChange={set("openingAnnual")} /></div>
              <div className="space-y-1.5"><Label htmlFor="openingSick">Sick</Label><Input id="openingSick" type="number" step="0.5" value={f.openingSick} onChange={set("openingSick")} placeholder="Full" /></div>
              <div className="space-y-1.5"><Label htmlFor="openingFamily">Family</Label><Input id="openingFamily" type="number" step="0.5" value={f.openingFamily} onChange={set("openingFamily")} placeholder="Full" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Leave sick or family blank for the full entitlement of the current cycle (sick: 6 weeks of work days per 3-year cycle, family: 3 days a year).</p>
          </fieldset>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : employee ? "Save changes" : "Add employee"}</Button>
            <Button type="button" variant="ghost" onClick={() => onDone(employee?.id)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ImportPanel({ onDone }: { onDone: () => Promise<void> }) {
  const [sheet, setSheet] = useState<{ name: string; rows: string[][] } | null>(null);
  const [text, setText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [balanceDate, setBalanceDate] = useState(todayKey());
  const [error, setError] = useState<string[] | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const source = sheet?.rows ?? (text.trim() ? textToRows(text) : null);
  const preview: ImportResult | null = source ? parseEmployeeRows(source, balanceDate) : null;

  async function onFile(file: File) {
    setResult(null);
    setError(null);
    try {
      const rows = /\.(csv|txt)$/i.test(file.name) ? textToRows(await file.text()) : await readXlsx(file);
      setSheet({ name: file.name, rows });
      setText("");
    } catch (err) {
      setSheet(null);
      setError([err instanceof Error ? err.message : "Could not read that file"]);
    }
  }

  async function submit() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const d = await jsonFetch("/api/modules/leave/employees", { method: "PUT", body: JSON.stringify({ rows: preview.rows }) });
      setResult(`Done — ${d.created} added, ${d.updated} updated.`);
      setSheet(null);
      setText("");
      await onDone();
    } catch (err) {
      const body = err instanceof Error ? err.message : "Import failed";
      setError([body]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import employees from Excel</CardTitle>
        <CardDescription>
          Upload a spreadsheet with one employee per row and a heading row. Columns: {IMPORT_COLUMNS.map((c) => c.label).join(", ")}.
          Only name and start date are required — days per month defaults to {DEFAULT_MONTHLY_ACCRUAL}. Employees already loaded
          (same employee number or name) are updated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-5 text-center text-sm hover:bg-muted/50">
          <FileUp className="size-6 text-muted-foreground" />
          <span className="font-medium">{sheet ? sheet.name : "Choose Excel file (.xlsx) or CSV"}</span>
          <span className="text-xs text-muted-foreground">{sheet ? "Click to choose a different file" : "The first sheet in the workbook is used"}</span>
          <input
            type="file"
            accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a href="/api/modules/leave/template" className="flex items-center gap-1 text-primary underline">
            <Download className="size-4" /> Download Excel template
          </a>
          <button type="button" className="text-muted-foreground underline" onClick={() => setShowPaste((s) => !s)}>
            {showPaste ? "Hide paste box" : "Or paste cells instead"}
          </button>
        </div>
        {showPaste && (
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setSheet(null); setResult(null); }}
            rows={6}
            placeholder={"Name\tEmployee number\tCellphone\tLevel\tStart date\tDays added per month\tAnnual leave balance\nSipho Ndlovu\tE001\t082 123 4567\tStaff\t2022-03-01\t1.25\t8.5"}
            className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
          />
        )}
        <div className="space-y-1.5">
          <Label htmlFor="importBalanceDate">Balances in the sheet are as at</Label>
          <Input id="importBalanceDate" type="date" value={balanceDate} onChange={(e) => setBalanceDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Days are added every month from this date, and leave taken from this date onward is deducted. A &ldquo;Balance date&rdquo;
            column in the sheet overrides this per employee.
          </p>
        </div>

        {preview && preview.errors.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">{preview.errors.slice(0, 10).map((e) => <li key={e}>{e}</li>)}</ul>
        )}
        {preview && preview.rows.length > 0 && preview.errors.length === 0 && (
          <div className="max-h-72 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left">
                  <th className="p-1.5">Name</th><th className="p-1.5">Phone</th><th className="p-1.5">Level</th><th className="p-1.5">Start</th>
                  <th className="p-1.5 text-right">Per month</th><th className="p-1.5 text-right">Annual</th><th className="p-1.5 text-right">Sick</th><th className="p-1.5 text-right">Family</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1.5">{r.fullName}</td><td className="p-1.5">{r.phone ?? "–"}</td><td className="p-1.5">{r.level}</td><td className="p-1.5">{r.startDate}</td>
                    <td className="p-1.5 text-right">{r.monthlyAccrual}</td><td className="p-1.5 text-right">{r.openingAnnual}</td>
                    <td className="p-1.5 text-right">{r.openingSick ?? "full"}</td><td className="p-1.5 text-right">{r.openingFamily ?? "full"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <ul className="list-disc pl-5 text-xs text-destructive">{error.map((e) => <li key={e}>{e}</li>)}</ul>}
        {result && <p className="text-sm text-green-700">{result}</p>}
        <Button disabled={busy || !preview?.rows.length || !!preview?.errors.length} onClick={submit}>
          {busy ? "Importing…" : `Import ${preview?.rows.length ?? 0} employees`}
        </Button>
      </CardContent>
    </Card>
  );
}

function EmployeeDetail({
  employee: e,
  data,
  reload,
  onWhatsApp,
  onEdit,
  onClose,
}: Props & { employee: Employee; onEdit: () => void; onClose: () => void }) {
  const [adj, setAdj] = useState({ leaveType: "annual", days: "", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const link = `${data.appUrl}/p/leave/me/${e.publicToken}`;
  const history = data.requests.filter((r) => r.employeeId === e.id);
  const first = e.fullName.split(/\s+/)[0];

  const shareLink = `https://wa.me/${waPhone(e.phone)}?text=${encodeURIComponent(
    `Hi ${first},\n\nHere is your personal leave link. You can see your leave balance and request leave here:\n${link}`,
  )}`;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const addAdjustment = (ev: React.FormEvent) => {
    ev.preventDefault();
    run(async () => {
      await jsonFetch(`/api/modules/leave/employees/${e.id}/adjust`, { method: "POST", body: JSON.stringify(adj) });
      setAdj({ ...adj, days: "", note: "" });
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{e.fullName}</CardTitle>
            <CardDescription>
              {[e.employeeNumber, e.level, e.phone].filter(Boolean).join(" · ")}
              <br />Started {new Date(e.startDate).toLocaleDateString("en-ZA", { timeZone: "UTC" })} · {e.balances.annual.monthlyAccrual} days added per month
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid grid-cols-3 gap-2">
          {(["annual", "sick", "family"] as const).map((t) => {
            const b = e.balances[t];
            return (
              <div key={t} className="rounded-lg bg-muted p-2.5" title={t === "annual" ? `Opening + accrued ${b.entitlement}, taken ${b.taken}, adjustments ${b.adjustments}` : `Cycle ${b.cycleStart} to ${b.cycleEnd}: ${b.entitlement} days, taken ${b.taken}`}>
                <p className={`text-xl font-bold ${b.available < 0 ? "text-red-700" : ""}`}>{b.available}</p>
                <p className="text-xs text-muted-foreground">{leaveTypeLabel(t).replace(" leave", "")}</p>
                <p className="text-[11px] text-muted-foreground">taken {b.taken}{b.pending ? ` · ${b.pending} pending` : ""}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Annual: {e.openingAnnual} opening on {new Date(e.balanceDate).toLocaleDateString("en-ZA", { timeZone: "UTC" })}, +{e.balances.annual.monthlyAccrual} per month
          (accrued to date: {e.balances.annual.entitlement}).
        </p>

        <div className="space-y-2">
          <p className="font-medium">Personal leave link</p>
          <LinkBox url={link} />
          <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
            <a href={shareLink} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> Send link on WhatsApp</a>
          </Button>
          {!e.phone && <p className="text-xs text-amber-700">No cellphone number — WhatsApp will ask you to pick the contact.</p>}
        </div>

        {data.canDelete && (
          <form onSubmit={addAdjustment} className="space-y-2 rounded-md border p-3">
            <p className="font-medium">Adjust balance</p>
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <select className={selectClass} value={adj.leaveType} onChange={(ev) => setAdj({ ...adj, leaveType: ev.target.value })}>
                <option value="annual">Annual leave</option>
                <option value="sick">Sick leave</option>
                <option value="family">Family responsibility</option>
              </select>
              <Input type="number" step="0.5" placeholder="+/- days" required value={adj.days} onChange={(ev) => setAdj({ ...adj, days: ev.target.value })} />
            </div>
            <Input placeholder="Reason, e.g. carried over from last year" required value={adj.note} onChange={(ev) => setAdj({ ...adj, note: ev.target.value })} />
            <Button size="sm" type="submit" disabled={busy}>Save adjustment</Button>
            {e.adjustments.length > 0 && (
              <ul className="space-y-1 pt-1 text-xs">
                {e.adjustments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className={a.days > 0 ? "text-green-700" : "text-red-700"}>{a.days > 0 ? "+" : ""}{a.days}</span>{" "}
                      {leaveTypeLabel(a.leaveType).toLowerCase()} — {a.note} <span className="text-muted-foreground">({a.createdBy}, {new Date(a.createdAt).toLocaleDateString("en-ZA")})</span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground underline"
                      onClick={() => run(() => jsonFetch(`/api/modules/leave/employees/${e.id}/adjust?adjustmentId=${a.id}`, { method: "DELETE" }))}
                    >
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}

        <div className="space-y-2">
          <p className="font-medium">Leave history</p>
          {history.length === 0 && <p className="text-xs text-muted-foreground">No leave yet.</p>}
          {history.slice(0, 30).map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 border-b pb-1.5 text-xs last:border-0">
              <span>
                {leaveTypeLabel(r.leaveType)} · {fmtLeaveRange(r.startDate, r.endDate)}{r.days ? ` · ${fmtDays(r.days)}` : ""}
              </span>
              <LeaveStatus status={r.status} />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => jsonFetch(`/api/modules/leave/employees/${e.id}`, { method: "PATCH", body: JSON.stringify({ active: !e.active }) }))}
          >
            {e.active ? "Archive (left the company)" : "Restore"}
          </Button>
          {data.canDelete &&
            (confirm ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => run(async () => { await jsonFetch(`/api/modules/leave/employees/${e.id}`, { method: "DELETE" }); onWhatsApp(null); onClose(); })}
                >
                  Yes, delete {first}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Keep</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm(true)}>Delete</Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
