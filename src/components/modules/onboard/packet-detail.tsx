"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Download, Eye, FileArchive, FileText, MessageCircle, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Button, Label, jsonFetch } from "@/components/modules/ui-bits";
import { LinkActions } from "@/components/modules/link-actions";
import { PacketForm, type PacketPayload } from "@/components/modules/onboard/packet-form";
import { STATUS, fmtDate, fmtDateTime } from "@/components/modules/onboard/types";
import type { Bank } from "@/lib/modules/onboard-items";
import type { PacketDetail as Detail, PacketSummary } from "@/lib/modules/onboard-server";
import { isWaPhone, waLink } from "@/lib/phone";

export function PacketDetail({
  id,
  company,
  canManage,
  leavePlanner,
  onChange,
  onDeleted,
  onClose,
}: {
  id: string;
  company: string;
  canManage: boolean;
  leavePlanner: boolean;
  onChange: (p: PacketSummary) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [bank, setBank] = useState<Bank | null>(null);
  const [addToLeave, setAddToLeave] = useState(true);
  const [accrual, setAccrual] = useState("1.25");

  useEffect(() => {
    jsonFetch<{ packet: Detail }>(`/api/modules/onboard/${id}`)
      .then((d) => setP(d.packet))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, [id]);

  if (error) return <Panel onClose={onClose}><p className="text-sm text-destructive">{error}</p></Panel>;
  if (!p) return <Panel onClose={onClose}><p className="text-sm text-muted-foreground">Loading…</p></Panel>;

  const first = p.employeeName.split(" ")[0];
  const st = STATUS[p.status] ?? STATUS.sent;
  const waText =
    p.status === "changes_requested"
      ? `Hi ${first}, ${company} needs a few changes to your onboarding pack:\n${p.reviewNote}\n\nPlease update it here:\n${p.publicUrl}`
      : `Hi ${first}, welcome to ${company}! Please complete your new-employee pack (personal details, bank details and documents) here:\n${p.publicUrl}`;

  async function run(key: string, fn: () => Promise<{ packet: Detail } | void>, done: string) {
    setBusy(key);
    setMsg(null);
    setError(null);
    try {
      const r = await fn();
      if (r) {
        setP(r.packet);
        onChange(r.packet);
      }
      setMsg(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }
  const patch = (body: object) => jsonFetch<{ packet: Detail }>(`/api/modules/onboard/${p.id}`, { method: "PATCH", body: JSON.stringify(body) });

  async function save(v: PacketPayload) {
    const r = await patch({ action: "update", ...v });
    setP(r.packet);
    onChange(r.packet);
    setEditing(false);
  }

  async function revealBank() {
    await run("bank", async () => {
      const d = await jsonFetch<{ bank: Bank; views: { by: string; at: string }[] }>(`/api/modules/onboard/${p!.id}/bank`, { method: "POST" });
      setBank(d.bank);
      setP({ ...p!, bankViews: d.views });
    }, "Bank details revealed. This view has been logged.");
  }

  async function remove() {
    if (!confirm(`Delete ${p!.employeeName}'s onboarding pack and all uploaded documents? This cannot be undone.`)) return;
    await run("delete", async () => {
      await jsonFetch(`/api/modules/onboard/${p!.id}`, { method: "DELETE" });
      onDeleted(p!.id);
    }, "Deleted");
  }

  if (editing) {
    return (
      <Panel onClose={onClose}>
        <h3 className="mb-3 font-semibold">Edit {p.employeeName}</h3>
        <PacketForm initial={p} initialRequirements={p.requirements.map((r) => r.key)} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(false)} />
      </Panel>
    );
  }

  const personal = p.personal;
  const canReview = p.status === "submitted";
  const waitingOnHire = ["sent", "in_progress", "changes_requested"].includes(p.status);

  return (
    <Panel onClose={onClose}>
      <div className="flex flex-wrap items-start justify-between gap-2 pr-8">
        <div>
          <h3 className="text-lg font-semibold">{p.employeeName}</h3>
          <p className="text-sm text-muted-foreground">{[p.jobTitle, p.department, p.employeeNumber && `#${p.employeeNumber}`].filter(Boolean).join(" · ") || "No job details"}</p>
          {p.startDate && <p className="text-sm text-muted-foreground">Starts {fmtDate(p.startDate)}</p>}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.tone}`}>{st.label}</span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground"><span>{p.progress.done} of {p.progress.total} complete</span><span>{p.progress.percent}%</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${p.progress.percent}%` }} /></div>
      </div>

      {msg && <p className="mt-3 rounded-md bg-green-50 p-2 text-sm text-green-900 dark:bg-green-950/40 dark:text-green-200">{msg}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {waitingOnHire && (
        <Section title="Send the link">
          <LinkActions url={p.publicUrl} title={`Onboarding pack - ${p.employeeName}`}>
            <Button size="sm" asChild className="bg-green-600 text-white hover:bg-green-700">
              <a href={waLink(p.employeePhone, waText)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp{isWaPhone(p.employeePhone) ? ` ${first}` : ""}</a>
            </Button>
            {p.employeeEmail && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${p.employeeEmail}?subject=${encodeURIComponent(`Your onboarding pack - ${company}`)}&body=${encodeURIComponent(waText)}`}>Email</a>
              </Button>
            )}
          </LinkActions>
        </Section>
      )}

      {p.status === "changes_requested" && p.reviewNote && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Changes requested:</strong> {p.reviewNote}
        </p>
      )}

      <Section title="Personal details">
        {!personal ? <p className="text-sm text-muted-foreground">Not filled in yet.</p> : (
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <Row k="Full names" v={`${personal.firstNames} ${personal.surname}`} />
            {personal.preferredName && <Row k="Known as" v={personal.preferredName} />}
            <Row k={personal.idType === "sa_id" ? "ID number" : `Passport (${personal.passportCountry})`} v={personal.idNumber} />
            <Row k="Date of birth" v={fmtDate(personal.dateOfBirth)} />
            {personal.gender && <Row k="Gender" v={personal.gender} />}
            {personal.nationality && <Row k="Nationality" v={personal.nationality} />}
            {personal.taxNumber && <Row k="Tax number" v={personal.taxNumber} />}
            <Row k="Cellphone" v={personal.cellphone} />
            {personal.email && <Row k="Email" v={personal.email} />}
            <Row k="Address" v={`${personal.homeAddress}${personal.postalCode ? `, ${personal.postalCode}` : ""}`} wide />
            <Row k="Emergency contact" v={`${personal.emergencyName} (${personal.emergencyRelationship}) · ${personal.emergencyPhone}`} wide />
          </dl>
        )}
      </Section>

      <Section title="Bank details">
        {!p.bank ? <p className="text-sm text-muted-foreground">Not filled in yet.</p> : bank ? (
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <Row k="Bank" v={bank.bankName} />
            <Row k="Account holder" v={bank.accountHolder} />
            <Row k="Account number" v={bank.accountNumber} />
            <Row k="Type" v={bank.accountType} />
            <Row k="Branch code" v={bank.branchCode} />
          </dl>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{p.bank.bankName} · {p.bank.accountType || "account"} {p.bank.accountMasked}</span>
            {canManage && <Button size="sm" variant="outline" disabled={!!busy} onClick={revealBank}><Eye className="size-4" />Reveal</Button>}
          </div>
        )}
        {p.bankViews.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Viewed {p.bankViews.length} time{p.bankViews.length === 1 ? "" : "s"}</summary>
            <ul className="mt-1 space-y-0.5">{p.bankViews.slice().reverse().slice(0, 20).map((x, i) => <li key={i}>{x.by} · {fmtDateTime(x.at)}</li>)}</ul>
          </details>
        )}
      </Section>

      <Section title="Documents">
        <ul className="space-y-1.5">
          {p.requirements.map((r) => (
            <li key={r.key} className="text-sm">
              <p className="flex items-center gap-1.5">
                {r.files.length ? <CheckCircle2 className="size-4 text-green-600" /> : <Circle className="size-4 text-muted-foreground" />}
                <span className={r.files.length ? "" : "text-muted-foreground"}>{r.label}</span>
              </p>
              {r.files.map((f) => (
                <a key={f.id} href={`/api/modules/onboard/${p.id}/documents/${f.id}`} target="_blank" rel="noreferrer" className="ml-6 flex items-center gap-1 text-xs text-primary underline">
                  <FileText className="size-3" />{f.fileName}
                </a>
              ))}
            </li>
          ))}
          {p.legacyDocs.map((d) => (
            <li key={d.url} className="text-sm"><a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary underline"><FileText className="size-4" />{d.label}</a></li>
          ))}
        </ul>
      </Section>

      {p.consentAt && (
        <Section title="Declaration">
          <p className="text-sm">Signed by <strong>{p.consentName}</strong> on {fmtDateTime(p.consentAt)} (POPIA consent).</p>
          {p.reviewedBy && p.status === "approved" && <p className="text-sm text-muted-foreground">Approved by {p.reviewedBy} on {fmtDateTime(p.reviewedAt)}</p>}
          {p.leaveEmployeeId && <p className="text-sm text-green-700 dark:text-green-400">Added to Leave Planner.</p>}
        </Section>
      )}

      {canReview && (
        <Section title="Review">
          {canManage && !asking && (
            <div className="space-y-2 rounded-md border p-3">
              {leavePlanner && (
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="size-4" checked={addToLeave} onChange={(e) => setAddToLeave(e.target.checked)} />
                    Add {first} to Leave Planner
                  </label>
                  {addToLeave && (
                    <label className="flex items-center gap-2 pl-6">
                      Earns <input type="number" step="0.01" min="0" max="5" className="h-8 w-20 rounded-md border bg-background px-2" value={accrual} onChange={(e) => setAccrual(e.target.value)} /> leave days per month
                    </label>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={!!busy} onClick={() => run("approve", () => patch({ action: "approve", addToLeave: leavePlanner && addToLeave, monthlyAccrual: Number(accrual) || 1.25 }), "Approved")}>
                  <CheckCircle2 className="size-4" />{busy === "approve" ? "Approving…" : "Approve"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAsking(true)}>Request changes</Button>
              </div>
            </div>
          )}
          {!canManage && !asking && <Button size="sm" variant="outline" onClick={() => setAsking(true)}>Request changes</Button>}
          {asking && (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="ob-note">What must {first} fix?</Label>
              <textarea id="ob-note" className="min-h-20 w-full rounded-md border bg-background p-2 text-sm" maxLength={2000} placeholder="e.g. The proof of address is older than 3 months. Please upload a recent one." value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" disabled={!!busy || note.trim().length < 3}
                  onClick={() => run("changes", async () => { const r = await patch({ action: "request_changes", note }); setAsking(false); setNote(""); return r; }, "Changes requested. Send the link again so they can fix it.")}>
                  Send back
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </Section>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        {canManage && (
          <>
            <Button size="sm" variant="outline" asChild><a href={`/api/modules/onboard/${p.id}/pdf`} target="_blank" rel="noreferrer"><Download className="size-4" />Info sheet PDF</a></Button>
            <Button size="sm" variant="outline" asChild><a href={`/api/modules/onboard/${p.id}/zip`}><FileArchive className="size-4" />Personnel file ZIP</a></Button>
          </>
        )}
        {p.status !== "approved" && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit</Button>}
        {(p.status === "approved" || p.status === "changes_requested") && (
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("reopen", () => patch({ action: "reopen" }), "Reopened")}><RotateCcw className="size-4" />Reopen</Button>
        )}
        {canManage && <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={!!busy} onClick={remove}><Trash2 className="size-4" />Delete</Button>}
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

function Row({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><dt className="inline text-muted-foreground">{k}: </dt><dd className="inline">{v}</dd></div>;
}
