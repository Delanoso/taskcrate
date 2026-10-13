"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownToLine, Ban, Copy, Download, MessageCircle, PenLine, X } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { PhotoList } from "@/components/modules/photo-list";
import { CONDITIONS, CUSTODY_TERMS, ISSUE_STATUS, OUTCOMES, label, money } from "@/lib/modules/equipment-options";
import { isWaPhone, waLink } from "@/lib/phone";
import { custodyInvite } from "@/components/modules/equipment/issue-tab";
import { ISSUE_TONE, OVERDUE_TONE, Pill, fmtDate, textareaClass, type EquipData, type Go, type IssueRow } from "@/components/modules/equipment/types";

type BatchRow = IssueRow & { itemName: string; assetTag: string | null };
type Detail = { issue: IssueRow; batch: BatchRow[] };

export function IssueDetail({ id, data, reload, go, onClose }: { id: string; data: EquipData; reload: () => Promise<unknown>; go: Go; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"sign" | "cancel" | "lost" | null>(null);
  const [text, setText] = useState("");
  const [signer, setSigner] = useState("");
  const [agree, setAgree] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [deduct, setDeduct] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [due, setDue] = useState("");

  useEffect(() => {
    jsonFetch<Detail>(`/api/modules/equipment/issues/${id}`)
      .then((r) => { setD(r); setDue(r.issue.dueBackAt ?? ""); setSigner(r.issue.employeeName); })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, [id]);

  if (!d) return <Panel onClose={onClose}>{error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-sm text-muted-foreground">Loading…</p>}</Panel>;
  const x = d.issue;
  const me = d.batch.find((b) => b.id === x.id)!;
  const open = x.status === "active" || x.status === "awaiting_signature";
  const item = data.items.find((i) => i.id === x.itemId);

  async function act(body: object, done: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await jsonFetch<Detail>(`/api/modules/equipment/issues/${x.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setD(r);
      setPanel(null);
      setMsg(done);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const reminder = x.status === "awaiting_signature";
  const waSign = waLink(x.employeePhone, custodyInvite(data.company, x.employeeName, x.signingUrl, d.batch.filter((b) => b.status === "awaiting_signature").length, x.reminderCount > 0));
  const waReturn = waLink(x.employeePhone, `Hi ${x.employeeName.split(" ")[0]}, ${me.itemName}${me.assetTag ? ` (${me.assetTag})` : ""} was due back on ${fmtDate(x.dueBackAt)}. Please return it to ${data.company} as soon as possible.`);

  const events = [
    { at: x.issuedAt, text: `Issued by ${x.issuedBy ?? "staff"} in ${label(CONDITIONS, x.conditionOut).toLowerCase()} condition` },
    x.signedAt && { at: x.signedAt, text: `Signed by ${x.signerName} ${x.signMethod === "link" ? `via link${x.signIp ? ` from ${x.signIp}` : ""}` : "in person"}` },
    x.lastRemindedAt && { at: x.lastRemindedAt, text: `Reminder sent (${x.reminderCount})` },
    x.returnedAt && x.status === "cancelled" && { at: x.returnedAt, text: `Cancelled by ${x.receivedBy}: ${x.cancelReason}` },
    x.returnedAt && x.status !== "cancelled" && { at: x.returnedAt, text: `${x.status === "lost" ? "Closed as lost" : "Checked in"} by ${x.receivedBy} · ${label(OUTCOMES, x.outcome)}` },
  ].filter((e): e is { at: string; text: string } => !!e).sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Panel onClose={onClose}>
      <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
        <div>
          <p className="text-xs text-muted-foreground">{x.documentNumber}{x.handbackNumber ? ` · ${x.handbackNumber}` : ""}</p>
          <h3 className="text-lg font-semibold">{me.itemName}{me.assetTag ? <span className="font-normal text-muted-foreground"> · {me.assetTag}</span> : null}</h3>
          <p className="text-sm">{x.employeeName}{x.employeeNumber ? ` · #${x.employeeNumber}` : ""}{x.employeePhone ? ` · ${x.employeePhone}` : ""}</p>
          {x.dueBackAt && <p className={`text-sm ${x.overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>Due back {fmtDate(x.dueBackAt)}{x.overdue ? " (overdue)" : ""}</p>}
        </div>
        <div className="flex gap-1">
          {x.overdue && <Pill tone={OVERDUE_TONE}>Overdue</Pill>}
          <Pill tone={ISSUE_TONE[x.status] ?? "bg-muted"}>{ISSUE_STATUS[x.status as keyof typeof ISSUE_STATUS] ?? x.status}</Pill>
        </div>
      </div>

      {msg && <p className="mt-3 rounded-md bg-green-50 p-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">{msg}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {d.batch.length > 1 && (
        <Section title={`On the same custody document (${d.batch.length})`}>
          <ul className="space-y-1 text-sm">
            {d.batch.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className={b.id === x.id ? "font-medium" : ""}>{b.itemName}{b.assetTag ? ` · ${b.assetTag}` : ""}</span>
                <Pill tone={ISSUE_TONE[b.status] ?? "bg-muted"}>{ISSUE_STATUS[b.status as keyof typeof ISSUE_STATUS] ?? b.status}</Pill>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {x.status === "awaiting_signature" && panel !== "sign" && (
        <Section title={reminder && x.reminderCount ? "Remind" : "Waiting for their signature"}>
          <p className="break-all rounded-md bg-muted/50 p-2 font-mono text-xs">{x.signingUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild className="bg-green-600 text-white hover:bg-green-700">
              <a href={waSign} target="_blank" rel="noreferrer" onClick={() => act({ action: "remind" }, "Reminder logged")}>
                <MessageCircle className="size-4" />WhatsApp{isWaPhone(x.employeePhone) ? "" : "…"}
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(x.signingUrl).then(() => setMsg("Link copied"))}><Copy className="size-4" />Copy link</Button>
            <Button size="sm" variant="outline" onClick={() => setPanel("sign")}><PenLine className="size-4" />Sign on this device</Button>
          </div>
        </Section>
      )}

      {panel === "sign" && (
        <Section title={`${x.employeeName} signs for custody`}>
          <ol className="max-h-32 list-decimal space-y-1 overflow-y-auto pl-5 text-xs text-muted-foreground">{CUSTODY_TERMS.map((t) => <li key={t}>{t}</li>)}</ol>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I received the items listed and accept the custody terms.</label>
          <Input value={signer} onChange={(e) => setSigner(e.target.value)} aria-label="Full name" />
          <SignaturePad onChange={setSig} height={130} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !agree || !sig || signer.trim().length < 3} onClick={() => act({ action: "sign_now", signerName: signer, signature: sig, agree: true }, "Signed")}>{busy ? "Saving…" : "Save signature"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Cancel</Button>
          </div>
        </Section>
      )}

      {x.status === "active" && x.overdue && (
        <Section title="Overdue">
          <Button size="sm" asChild className="bg-green-600 text-white hover:bg-green-700">
            <a href={waReturn} target="_blank" rel="noreferrer" onClick={() => act({ action: "remind" }, "Reminder logged")}><MessageCircle className="size-4" />Ask for it back on WhatsApp</a>
          </Button>
        </Section>
      )}

      {open && (
        <Section title="Return date">
          <div className="flex gap-2">
            <Input type="date" className="max-w-44" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Return by" />
            <Button size="sm" variant="outline" className="h-9" disabled={busy || due === (x.dueBackAt ?? "")} onClick={() => act({ action: "extend", dueBackAt: due || null }, due ? "Return date saved" : "Return date removed")}>Save</Button>
          </div>
        </Section>
      )}

      {(x.returnedAt && x.status !== "cancelled") && (
        <Section title="Handback">
          <p className="text-sm">Condition {label(CONDITIONS, x.conditionOut).toLowerCase()} → {x.conditionIn ? label(CONDITIONS, x.conditionIn).toLowerCase() : "-"} · {label(OUTCOMES, x.outcome)}</p>
          {x.damageNotes && <p className="text-sm text-muted-foreground">{x.damageNotes}</p>}
          {x.repairCost != null && <p className="text-sm">Cost: {money(x.repairCost)}{x.deductibleId ? " · deductible raised in the Ledger" : ""}</p>}
          {x.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {x.photos.map((p) => (
                <a key={p} href={p} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="Damage" className="size-20 rounded-md border object-cover" />
                </a>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Audit trail">
        <ol className="space-y-1 text-sm">
          {events.map((e, i) => <li key={i} className="flex gap-3"><span className="w-36 shrink-0 text-muted-foreground">{fmtDate(e.at, true)}</span><span>{e.text}</span></li>)}
        </ol>
        {(x.accessories || x.notesOut) && <p className="text-xs text-muted-foreground">{[x.accessories && `Accessories: ${x.accessories}`, x.notesOut].filter(Boolean).join(" · ")}</p>}
      </Section>

      {panel === "cancel" && (
        <Section title="Cancel this issue">
          <p className="text-xs text-muted-foreground">Use this when it was issued in error. The item goes straight back into store.</p>
          <textarea className={textareaClass} maxLength={500} placeholder="Reason" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy || text.trim().length < 3} onClick={() => act({ action: "cancel", reason: text }, "Cancelled. The item is back in store.")}>Cancel issue</Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Back</Button>
          </div>
        </Section>
      )}

      {panel === "lost" && (
        <Section title="Report lost or stolen">
          <textarea className={textareaClass} maxLength={1000} placeholder="What happened? For theft, add the SAPS case number." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="space-y-1.5">
            <Label htmlFor="lost-amt">Amount to recover (R)</Label>
            <Input id="lost-amt" inputMode="decimal" className="max-w-40" placeholder={item?.value != null ? String(item.value) : "0.00"} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {data.modules.ledger && (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4" checked={deduct} onChange={(e) => setDeduct(e.target.checked)} />Raise a deductible in the Loan &amp; Deductible Ledger (the employee must still sign consent)</label>
          )}
          <PhotoList value={photos} onChange={setPhotos} max={1} label="Photo / SAPS form" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy || text.trim().length < 3 || (deduct && !(Number(amount || item?.value) > 0))}
              onClick={() => act({ action: "lost", note: text, amount: amount ? Number(amount) : item?.value ?? null, raiseDeductible: deduct, photo: photos[0] ?? null }, "Recorded as lost")}>
              Record as lost
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Back</Button>
          </div>
        </Section>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button size="sm" variant="outline" asChild>
          <a href={`/api/modules/equipment/issues/${x.id}/pdf`} target="_blank" rel="noreferrer"><Download className="size-4" />{x.signedAt ? "Custody PDF" : "Preview custody PDF"}</a>
        </Button>
        {x.handbackNumber && (
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/modules/equipment/issues/${x.id}/pdf?type=handback`} target="_blank" rel="noreferrer"><Download className="size-4" />Handback report</a>
          </Button>
        )}
        {open && <Button size="sm" onClick={() => go.checkIn(x.employeeName)}><ArrowDownToLine className="size-4" />Check in</Button>}
        {open && !panel && (x.status === "awaiting_signature" || data.canManage) && <Button size="sm" variant="outline" onClick={() => { setText(""); setPanel("cancel"); }}><Ban className="size-4" />Cancel</Button>}
        {x.status === "active" && !panel && data.canManage && <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setText(""); setPanel("lost"); }}><AlertTriangle className="size-4" />Lost / stolen</Button>}
      </div>
    </Panel>
  );
}

export function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="relative rounded-lg border bg-card p-4">
      <button type="button" aria-label="Close" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={onClose}><X className="size-4" /></button>
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-4 space-y-2 border-t pt-3"><h4 className="text-sm font-semibold">{title}</h4>{children}</section>;
}
