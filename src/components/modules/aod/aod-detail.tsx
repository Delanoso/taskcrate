"use client";

import { useState } from "react";
import { Ban, Download, MessageCircle, PenLine, RotateCcw, Trash2, X } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { LinkActions } from "@/components/modules/link-actions";
import { SignaturePad } from "@/components/platform/signature-pad";
import { STATUS_LABEL, addMonths, aodTerms, methodLabel, money, periodLabel } from "@/lib/modules/aod-options";
import { isWaPhone, waLink } from "@/lib/phone";
import { ARREARS_TONE, Pill, STATUS_TONE, fmtDate, parseRand, selectClass, textareaClass, type AodData, type AodRow } from "@/components/modules/aod/types";

export function AodDetail({ record: r, data, onChange, onDeleted, onClose }: { record: AodRow; data: AodData; onChange: () => Promise<unknown>; onDeleted: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [panel, setPanel] = useState<"sign" | "employer" | "cancel" | null>(null);
  const [signer, setSigner] = useState(r.employeeName);
  const [agree, setAgree] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pay, setPay] = useState({ amount: String(r.dueThisMonth || r.instalmentAmount || ""), paidOn: new Date().toISOString().slice(0, 10), method: r.repayMethod === "payroll" ? "payroll" : r.repayMethod, note: "" });
  const [plan, setPlan] = useState({ amount: String(r.amount), instalment: String(r.instalmentAmount ?? ""), first: r.firstPeriod ?? addMonths(data.period, 1), method: r.repayMethod, description: r.description });

  async function act(body: object, done: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await jsonFetch(`/api/modules/loan/${r.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await onChange();
      setPanel(null);
      setMsg(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${r.reference}?`)) return;
    setBusy(true);
    try {
      await jsonFetch(`/api/modules/loan/${r.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
      setBusy(false);
    }
  }

  const planReady = !!(r.instalmentAmount && r.firstPeriod);
  const first = r.employeeName.split(" ")[0];
  const wa = waLink(r.employeePhone, `Hi ${first}, ${data.company} has prepared an acknowledgement of debt (${r.reference}) for ${money(r.amount)}: ${r.reasonText}. Please read it and sign on your phone:\n${r.signingUrl}`);
  const terms = aodTerms({ company: data.company, employeeName: r.employeeName, employeeIdNumber: r.employeeIdNumber, amount: r.amount, reason: r.reasonText, description: r.description, kind: r.kind, instalment: r.instalmentAmount, instalments: r.instalments, firstPeriod: r.firstPeriod, method: r.repayMethod });
  const events = [
    { at: r.createdAt, text: `Created by ${r.issuedBy ?? "staff"}${r.sourceRef ? ` from ${r.sourceRef}` : ""}` },
    r.lastRemindedAt && { at: r.lastRemindedAt, text: "Link sent / reminded" },
    r.signedAt && { at: r.signedAt, text: `Signed by ${r.signerName}${r.signIp ? ` from ${r.signIp}` : " in person"}` },
    r.declinedAt && { at: r.declinedAt, text: `Declined: ${r.declineReason}` },
    r.settledAt && { at: r.settledAt, text: "Settled in full" },
    r.cancelledAt && { at: r.cancelledAt, text: `Cancelled: ${r.cancelReason}` },
  ].filter((e): e is { at: string; text: string } => !!e).sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="relative rounded-lg border bg-card p-4">
      <button type="button" aria-label="Close" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={onClose}><X className="size-4" /></button>
      <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
        <div>
          <p className="text-xs text-muted-foreground">{r.reference} · {r.kind === "deductible" ? "Loss / damage" : "Loan"}</p>
          <h3 className="text-lg font-semibold">{r.reasonText}</h3>
          <p className="text-sm">{r.employeeName}{r.employeeNumber ? ` · #${r.employeeNumber}` : ""}{r.employeePhone ? ` · ${r.employeePhone}` : ""}</p>
        </div>
        <span className="flex gap-1">
          {r.arrears > 0 && <Pill tone={ARREARS_TONE}>{money(r.arrears)} behind</Pill>}
          <Pill tone={STATUS_TONE[r.status] ?? "bg-muted"}>{STATUS_LABEL[r.status] ?? r.status}</Pill>
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {[["Amount", money(r.amount)], ["Paid", money(r.paid)], ["Balance", money(r.balance)]].map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted/50 p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-2 text-sm text-muted-foreground">
        {planReady ? `${r.instalments} × ${money(r.instalmentAmount)} by ${methodLabel(r.repayMethod).toLowerCase()}, from ${periodLabel(r.firstPeriod!)}` : "No repayment plan yet"}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{r.description}</p>
      {r.photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {r.photos.map((p) => (
            <a key={p} href={p} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="Proof" className="size-16 rounded-md border object-cover" />
            </a>
          ))}
        </div>
      )}

      {msg && <p className="mt-3 rounded-md bg-green-50 p-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">{msg}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {r.status === "pending" && !planReady && (
        <Section title="Set the repayment plan">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1"><Label>Amount (R)</Label><Input inputMode="decimal" value={plan.amount} onChange={(e) => setPlan({ ...plan, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Monthly instalment (R)</Label><Input inputMode="decimal" value={plan.instalment} onChange={(e) => setPlan({ ...plan, instalment: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>First month</Label>
              <select className={selectClass} value={plan.first} onChange={(e) => setPlan({ ...plan, first: e.target.value })}>{Array.from({ length: 13 }, (_, i) => addMonths(data.period, i)).map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}</select>
            </div>
            <div className="space-y-1">
              <Label>Repaid by</Label>
              <select className={selectClass} value={plan.method} onChange={(e) => setPlan({ ...plan, method: e.target.value })}>
                <option value="payroll">Salary deduction</option><option value="eft">EFT</option><option value="cash">Cash</option>
              </select>
            </div>
          </div>
          <textarea className={textareaClass} value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
          <Button size="sm" disabled={busy || !parseRand(plan.amount) || !parseRand(plan.instalment)}
            onClick={() => act({ action: "plan", amount: parseRand(plan.amount), instalmentAmount: parseRand(plan.instalment), firstPeriod: plan.first, repayMethod: plan.method, description: plan.description }, "Plan saved. Send it to sign.")}>
            Save plan
          </Button>
        </Section>
      )}

      {r.status === "pending" && planReady && panel !== "sign" && (
        <Section title="Waiting for the employee to sign">
          <LinkActions url={r.signingUrl} title={`${r.reference} - ${r.employeeName}`}>
            <Button size="sm" asChild className="bg-green-600 text-white hover:bg-green-700">
              <a href={wa} target="_blank" rel="noreferrer" onClick={() => act({ action: "remind" }, "Link sent")}><MessageCircle className="size-4" />WhatsApp{isWaPhone(r.employeePhone) ? "" : "…"}</a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPanel("sign")}><PenLine className="size-4" />Sign on this device</Button>
          </LinkActions>
        </Section>
      )}

      {panel === "sign" && (
        <Section title={`${r.employeeName} reads and signs`}>
          <ol className="max-h-48 list-decimal space-y-1 overflow-y-auto pl-5 text-xs text-muted-foreground">{terms.map((t) => <li key={t}>{t}</li>)}</ol>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I have read this acknowledgement of debt and agree to it.</label>
          <Input value={signer} onChange={(e) => setSigner(e.target.value)} aria-label="Full name" />
          <SignaturePad onChange={setSig} height={130} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !agree || !sig || signer.trim().length < 3} onClick={() => act({ action: "sign_now", signerName: signer, signature: sig, agree: true }, "Signed")}>Save signature</Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Back</Button>
          </div>
        </Section>
      )}

      {r.status === "declined" && (
        <Section title="Declined">
          <p className="text-sm">{r.declineReason}</p>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act({ action: "reissue" }, "A new link is ready")}><RotateCcw className="size-4" />Send again</Button>
        </Section>
      )}

      {r.status === "active" && (
        <Section title="Record a payment">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1"><Label>Amount (R)</Label><Input className="w-28" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" className="w-40" value={pay.paidOn} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>How</Label>
              <select className="h-9 rounded-md border bg-background px-2 text-sm" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                <option value="payroll">Salary deduction</option><option value="eft">EFT</option><option value="cash">Cash</option><option value="other">Other</option>
              </select>
            </div>
            <Input className="min-w-32 flex-1" placeholder="Note" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
            <Button size="sm" className="h-9" disabled={busy || !parseRand(pay.amount)}
              onClick={() => act({ action: "payment", amount: parseRand(pay.amount), paidOn: pay.paidOn, method: pay.method, payrollPeriod: pay.method === "payroll" ? pay.paidOn.slice(0, 7) : null, note: pay.note || undefined }, "Payment recorded")}>
              Record
            </Button>
          </div>
        </Section>
      )}

      {r.schedule.length > 0 && (r.status === "active" || r.status === "settled") && (
        <Section title="Schedule">
          <ul className="max-h-48 space-y-0.5 overflow-y-auto text-sm">
            {r.schedule.map((p) => (
              <li key={p.period} className="flex justify-between gap-2">
                <span>{periodLabel(p.period)}</span>
                <span className={p.state === "late" ? "text-destructive" : p.state === "paid" ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                  {money(p.amount)} · {p.state === "paid" ? "paid" : p.state === "late" ? `late${p.paid ? ` (${money(p.paid)} paid)` : ""}` : p.state === "due" ? "due now" : "planned"}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {r.payments.length > 0 && (
        <Section title="Payments">
          <ul className="space-y-1 text-sm">
            {r.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>{fmtDate(p.paidOn)} · {money(p.amount)} · {methodLabel(p.method)}{p.payrollPeriod ? ` (${periodLabel(p.payrollPeriod)})` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                {data.canManage && <button type="button" className="text-xs text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => confirm("Remove this payment?") && act({ action: "remove_payment", paymentId: p.id }, "Payment removed")}>remove</button>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {panel === "employer" && (
        <Section title={`Sign for ${data.company}`}>
          <Input value={signer === r.employeeName ? data.me : signer} onChange={(e) => setSigner(e.target.value)} aria-label="Your name" />
          <SignaturePad onChange={setSig} height={120} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !sig} onClick={() => act({ action: "employer_sign", name: signer === r.employeeName ? data.me : signer, signature: sig }, "Company signature added")}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Back</Button>
          </div>
        </Section>
      )}

      {panel === "cancel" && (
        <Section title="Cancel or write off">
          <textarea className={textareaClass} maxLength={500} placeholder="Why? e.g. written off by the MD, issued in error" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy || text.trim().length < 3} onClick={() => act({ action: "cancel", reason: text }, "Cancelled")}>Cancel AOD</Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Back</Button>
          </div>
        </Section>
      )}

      <Section title="History">
        <ol className="space-y-1 text-sm">{events.map((e, i) => <li key={i} className="flex gap-3"><span className="w-36 shrink-0 text-muted-foreground">{fmtDate(e.at, true)}</span><span>{e.text}</span></li>)}</ol>
      </Section>

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button size="sm" variant="outline" asChild><a href={`/api/modules/loan/${r.id}/pdf`} target="_blank" rel="noreferrer"><Download className="size-4" />{r.signedAt ? "AOD & statement PDF" : "Preview PDF"}</a></Button>
        {r.status !== "cancelled" && !r.employerSignerName && !panel && <Button size="sm" variant="outline" onClick={() => { setSigner(data.me); setSig(null); setPanel("employer"); }}><PenLine className="size-4" />Sign for company</Button>}
        {data.canManage && (r.status === "pending" || r.status === "active") && !panel && <Button size="sm" variant="outline" onClick={() => { setText(""); setPanel("cancel"); }}><Ban className="size-4" />Cancel</Button>}
        {data.canManage && !r.payments.length && ["pending", "declined", "cancelled"].includes(r.status) && <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={remove}><Trash2 className="size-4" />Delete</Button>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-4 space-y-2 border-t pt-3"><h4 className="text-sm font-semibold">{title}</h4>{children}</section>;
}
