"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Button, jsonFetch } from "@/components/modules/ui-bits";
import { addMonths, money, periodLabel } from "@/lib/modules/aod-options";
import { selectClass, type AodData } from "@/components/modules/aod/types";

type Row = { recordId: string; reference: string | null; employeeName: string; employeeNumber: string | null; amount: number; recorded: boolean; balanceAfter: number };

export function PayrollTab({ data, reload }: { data: AodData; reload: () => Promise<unknown> }) {
  const [period, setPeriod] = useState(data.period);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    jsonFetch<{ rows: Row[] }>(`/api/modules/loan/payroll?period=${period}`)
      .then((r) => live && setRows(r.rows))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load"));
    return () => { live = false; };
  }, [period]);

  async function record() {
    if (!confirm(`Mark the ${periodLabel(period)} salary deductions as taken? Each AOD balance goes down by its instalment.`)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await jsonFetch<{ recorded: number }>("/api/modules/loan/payroll", { method: "POST", body: JSON.stringify({ period }) });
      setMsg(`${r.recorded} deduction${r.recorded === 1 ? "" : "s"} recorded.`);
      setRows((await jsonFetch<{ rows: Row[] }>(`/api/modules/loan/payroll?period=${period}`)).rows);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record");
    } finally {
      setBusy(false);
    }
  }

  const total = rows?.reduce((a, r) => a + r.amount, 0) ?? 0;
  const open = rows?.filter((r) => !r.recorded).length ?? 0;
  const months = Array.from({ length: 15 }, (_, i) => addMonths(data.period, i - 6));

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        {data.payrollLinked
          ? "Your Payroll app takes these deductions automatically when you calculate the month, and records them when you finalise it."
          : "Send this list to whoever runs payroll. After pay day, mark the deductions as taken so the balances go down."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${selectClass} max-w-48`} value={period} onChange={(e) => { setPeriod(e.target.value); setRows(null); setMsg(null); }} aria-label="Month">
          {months.map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}
        </select>
        <Button size="sm" variant="outline" className="h-9" asChild><a href={`/api/modules/loan/payroll?period=${period}&format=xlsx`}><Download className="size-4" />Excel</a></Button>
        {data.canManage && open > 0 && <Button size="sm" className="h-9" disabled={busy} onClick={record}><CheckCircle2 className="size-4" />{busy ? "Saving…" : "Mark as deducted"}</Button>}
      </div>
      {msg && <p className="rounded-md bg-green-50 p-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">{msg}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No salary deductions for {periodLabel(period)}.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 font-medium">Employee</th><th className="px-3 py-2 font-medium">AOD</th><th className="px-3 py-2 text-right font-medium">Deduct</th><th className="px-3 py-2 text-right font-medium">Balance after</th><th className="px-3 py-2" /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.recordId} className="border-t">
                  <td className="px-3 py-2">{r.employeeName}{r.employeeNumber ? <span className="text-muted-foreground"> · #{r.employeeNumber}</span> : null}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.reference}</td>
                  <td className="px-3 py-2 text-right font-medium">{money(r.amount)}</td>
                  <td className="px-3 py-2 text-right">{money(r.balanceAfter)}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.recorded ? <span className="text-green-700 dark:text-green-400">Deducted</span> : <span className="text-muted-foreground">To deduct</span>}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-medium"><td className="px-3 py-2" colSpan={2}>Total</td><td className="px-3 py-2 text-right">{money(total)}</td><td colSpan={2} /></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
