"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, MessageCircle, Plus, Search, Trash2, Users } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { inviteText } from "@/components/modules/contract/doc-detail";
import { selectClass, textareaClass, type ContractData, type ContractDoc, type Person } from "@/components/modules/contract/types";
import { STANDARD_KEYS, fieldLabel, mergeKeys } from "@/lib/modules/contract-library";
import { isWaPhone, waLink } from "@/lib/phone";

type Recipient = { name: string; phone: string; email: string; employeeNumber: string; jobTitle: string };
const blank: Recipient = { name: "", phone: "", email: "", employeeNumber: "", jobTitle: "" };
const fromPerson = (p: Person): Recipient => ({ name: p.name, phone: p.phone ?? "", email: p.email ?? "", employeeNumber: p.employeeNumber ?? "", jobTitle: p.jobTitle ?? "" });

export function SendTab({ data, onSent, openDoc, initialTemplate }: { data: ContractData; onSent: (docs: ContractDoc[]) => void; openDoc: (id: string) => void; initialTemplate?: string | null }) {
  const active = data.templates.filter((t) => !t.archived);
  const [templateId, setTemplateId] = useState<string>(initialTemplate ?? active[0]?.id ?? "oneoff");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([{ ...blank }]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const t = data.templates.find((x) => x.id === templateId) ?? null;
  const [dueDate, setDueDate] = useState(() => dueFrom(t?.dueDays));
  const [countersign, setCountersign] = useState(t?.requireCountersign ?? false);
  const [picker, setPicker] = useState(false);
  const [pq, setPq] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<ContractDoc[] | null>(null);

  const text = t ? t.bodyText : bodyText;
  const extraKeys = useMemo(() => mergeKeys(text).filter((k) => !STANDARD_KEYS.includes(k) || (k === "job_title" && recipients.some((r) => !r.jobTitle.trim()))), [text, recipients]);
  const chosen = new Set(recipients.map((r) => r.name.trim().toLowerCase()).filter(Boolean));
  const people = data.directory.filter((p) => !pq.trim() || p.name.toLowerCase().includes(pq.trim().toLowerCase()) || p.employeeNumber?.toLowerCase().includes(pq.trim().toLowerCase()));

  function pickTemplate(id: string) {
    setTemplateId(id);
    const nt = data.templates.find((x) => x.id === id);
    setDueDate(dueFrom(nt?.dueDays));
    setCountersign(nt?.requireCountersign ?? false);
  }
  const setR = (i: number, patch: Partial<Recipient>) => setRecipients((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  function togglePerson(p: Person) {
    const key = p.name.toLowerCase();
    setRecipients((rs) => {
      const clean = rs.filter((r) => r.name.trim());
      return chosen.has(key) ? clean.filter((r) => r.name.trim().toLowerCase() !== key) : [...clean, fromPerson(p)];
    });
  }
  function selectAll() {
    setRecipients((rs) => {
      const clean = rs.filter((r) => r.name.trim());
      const have = new Set(clean.map((r) => r.name.trim().toLowerCase()));
      return [...clean, ...people.filter((p) => !have.has(p.name.toLowerCase())).map(fromPerson)];
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const list = recipients.filter((r) => r.name.trim());
    if (!list.length) return setError("Add at least one person.");
    setBusy(true);
    setError(null);
    try {
      const r = await jsonFetch<{ documents: ContractDoc[] }>("/api/modules/contract", {
        method: "POST",
        body: JSON.stringify({
          templateId: t ? t.id : null,
          title: t ? null : title,
          bodyText: t ? null : bodyText,
          recipients: list,
          fields,
          dueDate: dueDate || null,
          requireCountersign: countersign,
        }),
      });
      onSent(r.documents);
      setSent(r.documents);
      setRecipients([{ ...blank }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-green-600" />{sent.length === 1 ? "Ready to send" : `${sent.length} signing links ready`}</p>
        <p className="text-sm text-muted-foreground">Send each person their own link. Tap WhatsApp to open a chat with the message filled in.</p>
        <ul className="divide-y rounded-md border">
          {sent.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
              <button type="button" className="mr-auto text-left font-medium underline-offset-2 hover:underline" onClick={() => openDoc(d.id)}>{d.employeeName}</button>
              <Button size="sm" asChild className="bg-green-600 text-white hover:bg-green-700">
                <a href={waLink(d.employeePhone, inviteText(d, data.company))} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp{isWaPhone(d.employeePhone) ? "" : "…"}</a>
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(d.signingUrl)}><Copy className="size-4" />Link</Button>
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={() => setSent(null)}>Send another</Button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-5 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="cs-t">Document</Label>
        <select id="cs-t" className={selectClass} value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
          {active.map((x) => <option key={x.id} value={x.id}>{x.name}{x.kind === "pdf" ? ` (PDF, ${x.pageCount} pages)` : ""}</option>)}
          <option value="oneoff">One-off document (type it now)</option>
        </select>
        {!active.length && <p className="text-xs text-muted-foreground">Tip: add ready-made contracts and policies in the Templates tab.</p>}
      </div>

      {!t && (
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="cs-title">Title</Label><Input id="cs-title" required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shift allowance agreement" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-body">Text</Label>
            <textarea id="cs-body" required minLength={20} className={`${textareaClass} min-h-48`} value={bodyText} onChange={(e) => setBodyText(e.target.value)}
              placeholder={"Start a line with # for a heading and - for a bullet.\nUse {{employee_name}} to insert each person's name."} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Who must sign</Label>
          <div className="flex gap-2">
            {data.directory.length > 0 && <Button type="button" size="sm" variant="outline" onClick={() => setPicker((v) => !v)}><Users className="size-4" />Staff list</Button>}
            <Button type="button" size="sm" variant="outline" onClick={() => setRecipients((rs) => [...rs, { ...blank }])}><Plus className="size-4" />Add person</Button>
          </div>
        </div>
        {picker && (
          <div className="space-y-2 rounded-md border p-2">
            <div className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search staff" value={pq} onChange={(e) => setPq(e.target.value)} /></div>
              <Button type="button" size="sm" variant="ghost" className="h-9" onClick={selectAll}>Select all</Button>
            </div>
            <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
              {people.map((p) => (
                <label key={p.name} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                  <input type="checkbox" className="size-4" checked={chosen.has(p.name.toLowerCase())} onChange={() => togglePerson(p)} />
                  <span className="truncate">{p.name}</span>
                  {p.employeeNumber && <span className="text-xs text-muted-foreground">#{p.employeeNumber}</span>}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {recipients.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1.4fr_1fr_1fr_0.7fr_auto]">
              <Input aria-label="Name" placeholder="Full name" value={r.name} onChange={(e) => setR(i, { name: e.target.value })} />
              <Input aria-label="Cellphone" type="tel" placeholder="Cellphone" value={r.phone} onChange={(e) => setR(i, { phone: e.target.value })} />
              <Input aria-label="Job title" placeholder="Job title" value={r.jobTitle} onChange={(e) => setR(i, { jobTitle: e.target.value })} />
              <Input aria-label="Employee number" placeholder="Emp. no." value={r.employeeNumber} onChange={(e) => setR(i, { employeeNumber: e.target.value })} />
              <Button type="button" size="sm" variant="ghost" className="h-9" aria-label="Remove" disabled={recipients.length === 1} onClick={() => setRecipients((rs) => rs.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      </div>

      {extraKeys.length > 0 && (
        <div className="space-y-2">
          <Label>Fill in the blanks</Label>
          <p className="text-xs text-muted-foreground">These go into the document for everyone you send it to. Anything left empty prints as a blank line.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {extraKeys.map((k) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={`f-${k}`} className="text-xs">{fieldLabel(k)}</Label>
                <Input id={`f-${k}`} value={fields[k] ?? ""} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="cs-due">Sign by (optional)</Label><Input id="cs-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" className="size-4" checked={countersign} onChange={(e) => setCountersign(e.target.checked)} />
          Company countersigns after the employee
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Creating links…" : `Create ${recipients.filter((r) => r.name.trim()).length > 1 ? `${recipients.filter((r) => r.name.trim()).length} signing links` : "signing link"}`}</Button>
    </form>
  );
}

function dueFrom(days: number | null | undefined) {
  if (!days) return "";
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}
