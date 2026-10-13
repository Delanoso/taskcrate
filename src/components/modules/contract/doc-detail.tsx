"use client";

import { useEffect, useState } from "react";
import { Ban, Copy, Download, Mail, MessageCircle, RotateCcw, Trash2, X } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { Pill, STATUS_TONE, fmtDate, textareaClass, type ContractData, type ContractDetail, type ContractDoc } from "@/components/modules/contract/types";
import { STATUS_LABEL } from "@/lib/modules/contract-library";
import { isWaPhone, waLink } from "@/lib/phone";

export function inviteText(d: ContractDoc, company: string, reminder = false) {
  const first = d.employeeName.split(" ")[0];
  const due = d.dueDate ? ` by ${fmtDate(d.dueDate)}` : "";
  return reminder
    ? `Hi ${first}, a reminder from ${company}: please read and sign "${d.title}"${due}:\n${d.signingUrl}`
    : `Hi ${first}, ${company} has sent you "${d.title}" to read and sign${due}. You sign once on your phone:\n${d.signingUrl}`;
}

export function DocDetail({
  id,
  data,
  onChange,
  onCreated,
  onDeleted,
  onClose,
}: {
  id: string;
  data: ContractData;
  onChange: (d: ContractDoc) => void;
  onCreated: (d: ContractDoc) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<ContractDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [csName, setCsName] = useState(data.me);
  const [csSig, setCsSig] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    jsonFetch<{ document: ContractDetail }>(`/api/modules/contract/${id}`)
      .then((r) => setD(r.document))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, [id]);

  if (!d) return <Panel onClose={onClose}>{error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-sm text-muted-foreground">Loading…</p>}</Panel>;

  async function act(key: string, body: object, done: string) {
    setBusy(key);
    setError(null);
    setMsg(null);
    try {
      const r = await jsonFetch<{ document: ContractDetail; created?: ContractDoc }>(`/api/modules/contract/${d!.id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (r.created) {
        onCreated(r.created);
      } else {
        setD(r.document);
        onChange(r.document);
      }
      setMsg(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${d!.reference} for ${d!.employeeName}? The signed copy will be deleted too.`)) return;
    setBusy("delete");
    try {
      await jsonFetch(`/api/modules/contract/${d!.id}`, { method: "DELETE" });
      onDeleted(d!.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
      setBusy(null);
    }
  }

  const open = d.status === "sent" || d.status === "viewed";
  const reminder = open && (d.viewedAt !== null || d.reminderCount > 0 || openedAt - new Date(d.createdAt).getTime() > 36e5);
  const wa = waLink(d.employeePhone, inviteText(d, data.company, reminder));
  const events = [
    { at: d.createdAt, text: `Sent${d.sentBy ? ` by ${d.sentBy}` : ""}` },
    d.lastRemindedAt && { at: d.lastRemindedAt, text: `Reminder sent (${d.reminderCount})` },
    d.viewedAt && { at: d.viewedAt, text: `Opened${d.viewIp ? ` from ${d.viewIp}` : ""}` },
    d.signedAt && { at: d.signedAt, text: `Signed by ${d.signerName}${d.signerIdNumber ? ` (ID ${d.signerIdNumber})` : ""}${d.signIp ? ` from ${d.signIp}` : ""}` },
    d.countersignedAt && { at: d.countersignedAt, text: `Countersigned by ${d.countersignName}` },
    d.declinedAt && { at: d.declinedAt, text: `Declined: ${d.declineReason}` },
    d.voidedAt && { at: d.voidedAt, text: `Voided: ${d.voidReason}` },
  ]
    .filter((e): e is { at: string; text: string } => !!e)
    .sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Panel onClose={onClose}>
      <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
        <div>
          <p className="text-xs text-muted-foreground">{d.reference}{d.templateName && d.templateName !== d.title ? ` · ${d.templateName}` : ""}</p>
          <h3 className="text-lg font-semibold">{d.title}</h3>
          <p className="text-sm">{d.employeeName}{d.jobTitle ? ` · ${d.jobTitle}` : ""}{d.employeeNumber ? ` · #${d.employeeNumber}` : ""}</p>
          {d.dueDate && <p className={`text-sm ${d.overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>Due {fmtDate(d.dueDate)}{d.overdue ? " (overdue)" : ""}</p>}
        </div>
        <Pill tone={STATUS_TONE[d.status] ?? "bg-muted"}>{STATUS_LABEL[d.status] ?? d.status}</Pill>
      </div>

      {msg && <p className="mt-3 rounded-md bg-green-50 p-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">{msg}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {open && (
        <Section title={reminder ? "Remind" : "Send the link"}>
          <p className="break-all rounded-md bg-muted/50 p-2 font-mono text-xs">{d.signingUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild className="bg-green-600 text-white hover:bg-green-700">
              <a href={wa} target="_blank" rel="noreferrer" onClick={() => reminder && act("remind", { action: "remind" }, "Reminder logged")}>
                <MessageCircle className="size-4" />{reminder ? "WhatsApp reminder" : "WhatsApp"}{isWaPhone(d.employeePhone) ? "" : "…"}
              </a>
            </Button>
            {d.employeeEmail && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${d.employeeEmail}?subject=${encodeURIComponent(`${d.title} - please sign`)}&body=${encodeURIComponent(inviteText(d, data.company, reminder))}`}><Mail className="size-4" />Email</a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(d.signingUrl).then(() => setMsg("Link copied"))}><Copy className="size-4" />Copy link</Button>
          </div>
        </Section>
      )}

      {d.status === "awaiting_countersign" && data.canManage && (
        <Section title={`Countersign for ${data.company}`}>
          <div className="space-y-1.5"><Label htmlFor="cs-name">Your name</Label><Input id="cs-name" value={csName} onChange={(e) => setCsName(e.target.value)} /></div>
          <SignaturePad onChange={setCsSig} height={130} />
          <Button size="sm" disabled={!csSig || csName.trim().length < 2 || !!busy} onClick={() => act("cs", { action: "countersign", name: csName, signature: csSig }, "Countersigned. The final PDF is ready.")}>
            {busy === "cs" ? "Saving…" : "Countersign"}
          </Button>
        </Section>
      )}

      <Section title="Audit trail">
        <ol className="space-y-1 text-sm">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3"><span className="w-36 shrink-0 text-muted-foreground">{fmtDate(e.at, true)}</span><span>{e.text}</span></li>
          ))}
        </ol>
        {d.contentHash && <p className="break-all text-xs text-muted-foreground">Fingerprint (SHA-256): {d.contentHash}</p>}
        {d.signUserAgent && <p className="text-xs text-muted-foreground">Device: {d.signUserAgent}</p>}
      </Section>

      {d.bodyText && (
        <Section title="Document text">
          <button type="button" className="text-sm text-primary underline" onClick={() => setShowText((v) => !v)}>{showText ? "Hide" : "Show what was sent"}</button>
          {showText && <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-sans text-xs">{d.bodyText}</pre>}
        </Section>
      )}

      {voiding && (
        <Section title="Void document">
          <textarea className={textareaClass} maxLength={500} placeholder="Why is this being withdrawn?" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={reason.trim().length < 3 || !!busy}
              onClick={async () => { if (await act("void", { action: "void", reason }, "Voided. The link no longer works.")) setVoiding(false); }}>
              Void
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setVoiding(false)}>Cancel</Button>
          </div>
        </Section>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button size="sm" variant="outline" asChild>
          <a href={`/api/modules/contract/${d.id}/pdf`} target="_blank" rel="noreferrer"><Download className="size-4" />{d.signedAt ? "Signed PDF" : "Preview PDF"}</a>
        </Button>
        {(open || d.status === "awaiting_countersign") && !voiding && <Button size="sm" variant="outline" onClick={() => setVoiding(true)}><Ban className="size-4" />Void</Button>}
        {(d.status === "declined" || d.status === "voided") && (
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act("reissue", { action: "reissue" }, "Sent again with a new link")}><RotateCcw className="size-4" />Send again</Button>
        )}
        {data.canManage && <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={!!busy} onClick={remove}><Trash2 className="size-4" />Delete</Button>}
      </div>
    </Panel>
  );
}

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="relative rounded-lg border bg-card p-4">
      <button type="button" aria-label="Close" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={onClose}><X className="size-4" /></button>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-4 space-y-2 border-t pt-3"><h4 className="text-sm font-semibold">{title}</h4>{children}</section>;
}
