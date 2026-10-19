"use client";

import { useState } from "react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { PhotoList } from "@/components/modules/photo-list";
import { addMonths, money, periodLabel, schedule } from "@/lib/modules/aod-options";
import { parseRand, reasonOptions, selectClass, textareaClass, type AodData, type AodRow } from "@/components/modules/aod/types";

export function AodForm({ data, onCreated }: { data: AodData; onCreated: (id: string) => void }) {
  const options = reasonOptions(data);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [reason, setReason] = useState(options[0]?.key ?? "other");
  const [otherLabel, setOtherLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [incident, setIncident] = useState("");
  const [planBy, setPlanBy] = useState<"months" | "amount">("months");
  const [months, setMonths] = useState("3");
  const [instalment, setInstalment] = useState("");
  const [first, setFirst] = useState(addMonths(data.period, 1));
  const [method, setMethod] = useState<"payroll" | "cash" | "eft">("payroll");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const person = data.people.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  const chosen = options.find((o) => o.key === reason);
  const kind = chosen?.kind ?? "loan";
  const total = parseRand(amount);
  const n = Math.max(1, Math.min(120, Number(months) || 1));
  const each = planBy === "months" ? (total ? Math.ceil((total / n) * 100) / 100 : null) : parseRand(instalment);
  const plan = total && each ? schedule(total, each, first) : [];
  const cap = kind === "deductible" && method === "payroll" && person?.salary ? person.salary / 4 : null;
  const overCap = !!(cap && each && each > cap + 0.005);

  function pick(v: string) {
    setName(v);
    const p = data.people.find((x) => x.name.toLowerCase() === v.trim().toLowerCase());
    if (p) {
      if (p.employeeNumber) setNumber(p.employeeNumber);
      if (p.phone) setPhone(p.phone);
      if (p.idNumber) setIdNumber(p.idNumber);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await jsonFetch<{ record: AodRow }>("/api/modules/loan", {
        method: "POST",
        body: JSON.stringify({
          employeeName: name, employeeNumber: number || null, employeePhone: phone || null, employeeIdNumber: idNumber || null,
          reason, reasonLabel: reason === "other" ? otherLabel : null, amount: total, description, incidentDate: incident || null,
          instalmentAmount: each, firstPeriod: first, repayMethod: method, photos,
        }),
      });
      onCreated(r.record.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  const ready = name.trim().length >= 2 && !!total && !!each && description.trim().length >= 3 && (reason !== "other" || otherLabel.trim().length >= 3) && !overCap;
  const months12 = Array.from({ length: 13 }, (_, i) => addMonths(data.period, i));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">Who owes the money?</h3>
        <div className="space-y-1.5">
          <Label htmlFor="aod-name">Employee</Label>
          <Input id="aod-name" list="aod-people" value={name} onChange={(e) => pick(e.target.value)} placeholder="Start typing a name" autoComplete="off" />
          <datalist id="aod-people">{data.people.map((p) => <option key={p.name} value={p.name} />)}</datalist>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="aod-no">Employee no.</Label><Input id="aod-no" value={number} onChange={(e) => setNumber(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="aod-ph">Cellphone</Label><Input id="aod-ph" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For WhatsApp" /></div>
          <div className="space-y-1.5"><Label htmlFor="aod-id">ID number</Label><Input id="aod-id" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} /></div>
        </div>

        <h3 className="pt-2 font-semibold">What is it for?</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="aod-reason">Reason</Label>
            <select id="aod-reason" className={selectClass} value={reason} onChange={(e) => setReason(e.target.value)}>
              <optgroup label="Loans and amounts owed">{options.filter((o) => o.kind === "loan" && o.key !== "other").map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>
              <optgroup label="Loss or damage">{options.filter((o) => o.kind === "deductible").map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>
              <option value="other">Other (type it)</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="aod-amt">Amount owed (R)</Label><Input id="aod-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
        </div>
        {reason === "other" && <Input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} placeholder="Reason, e.g. Petrol card used privately" />}
        <textarea className={textareaClass} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === "deductible" ? "What was lost or damaged, how it happened, and how the amount was worked out" : "What the amount is for, e.g. advance paid on 3 October"} />
        {kind === "deductible" && (
          <>
            <div className="space-y-1.5"><Label htmlFor="aod-inc">Date of the incident</Label><Input id="aod-inc" type="date" className="max-w-44" value={incident} onChange={(e) => setIncident(e.target.value)} /></div>
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Loss or damage may only be recovered if it was the employee&apos;s fault, they had a fair chance to explain, the amount is not more than the actual loss, and no monthly deduction is more than a quarter of their pay (BCEA s34(2)).
            </p>
            <PhotoList value={photos} onChange={setPhotos} max={6} label="Photo proof" />
          </>
        )}
        {kind !== "deductible" && <PhotoList value={photos} onChange={setPhotos} max={6} label="Slip / proof" />}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">How is it repaid?</h3>
        <div className="grid grid-cols-3 gap-2">
          {([["payroll", "Salary deduction"], ["eft", "EFT"], ["cash", "Cash"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMethod(k)} className={`rounded-md border p-2 text-sm ${method === k ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" checked={planBy === "months"} onChange={() => setPlanBy("months")} />Over a number of months</label>
          <label className="flex items-center gap-1.5"><input type="radio" checked={planBy === "amount"} onChange={() => setPlanBy("amount")} />Fixed monthly amount</label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {planBy === "months" ? (
            <div className="space-y-1.5"><Label htmlFor="aod-m">Months</Label><Input id="aod-m" type="number" min={1} max={120} value={months} onChange={(e) => setMonths(e.target.value)} /></div>
          ) : (
            <div className="space-y-1.5"><Label htmlFor="aod-i">Monthly instalment (R)</Label><Input id="aod-i" inputMode="decimal" value={instalment} onChange={(e) => setInstalment(e.target.value)} /></div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="aod-f">First {method === "payroll" ? "deduction" : "payment"}</Label>
            <select id="aod-f" className={selectClass} value={first} onChange={(e) => setFirst(e.target.value)}>{months12.map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}</select>
          </div>
        </div>
        {cap && <p className={`text-xs ${overCap ? "font-medium text-destructive" : "text-muted-foreground"}`}>Pay on file: {money(person!.salary)}. The most that may be deducted per month for loss or damage is {money(cap)}.</p>}
        {plan.length > 0 && (
          <div className="rounded-md border">
            <p className="border-b bg-muted/40 px-3 py-2 text-sm"><strong>{plan.length}</strong> instalment{plan.length === 1 ? "" : "s"} of {money(each)} · {periodLabel(plan[0].period)} to {periodLabel(plan[plan.length - 1].period)}</p>
            <ul className="max-h-40 overflow-y-auto px-3 py-2 text-xs text-muted-foreground">
              {plan.map((p) => <li key={p.period} className="flex justify-between"><span>{periodLabel(p.period)}</span><span>{money(p.amount)}</span></li>)}
            </ul>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={!ready || busy} onClick={submit}>{busy ? "Saving…" : "Create AOD and get signing link"}</Button>
        <p className="text-center text-xs text-muted-foreground">Nothing is deducted until the employee has signed.</p>
      </section>
    </div>
  );
}
