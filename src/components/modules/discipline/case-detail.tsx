"use client";

import { useRef, useState } from "react";
import { Camera, FileText, MessageCircle, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { CaseForm, type CasePayload } from "@/components/modules/discipline/case-form";
import {
  SANCTION_TONE, STATUS_TONE, fmtDate, localDateTime, selectClass, textareaClass, todayKey,
  type Case, type DisciplineData,
} from "@/components/modules/discipline/types";
import { fileToCompressedDataUrl } from "@/lib/image-compress";
import { SANCTIONS, SEVERITY_LABEL, isWarning, sanctionLabel, statusLabel, suggestSanction, type SanctionKey } from "@/lib/modules/discipline-options";
import { isWaPhone, waLink } from "@/lib/phone";

export function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}

export function CaseDetail({
  c,
  data,
  onChange,
  onDeleted,
  onClose,
}: {
  c: Case;
  data: DisciplineData;
  onChange: (c: Case) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const others = data.cases.filter((x) => x.employeeKey === c.employeeKey && x.id !== c.id);
  const activeWarnings = others.filter((x) => x.activeWarning);
  const suggestion = c.offenceSeverity ? suggestSanction(c.offenceSeverity, activeWarnings.map((w) => w.sanction)) : null;
  const editable = c.status === "open" || c.status === "hearing";
  const first = c.employeeName.split(/\s+/)[0];

  async function run(key: string, fn: () => Promise<{ case?: Case }>, okText?: string) {
    setBusy(key);
    setError(null);
    setOk(null);
    try {
      const d = await fn();
      if (d.case) onChange(d.case);
      if (okText) setOk(okText);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(null);
    }
  }
  const patch = (body: object) => jsonFetch<{ case: Case }>(`/api/modules/discipline/${c.id}`, { method: "PATCH", body: JSON.stringify(body) });

  async function saveDetails(p: CasePayload) {
    const d = await patch({ action: "details", ...p });
    onChange(d.case);
    setEditing(false);
  }

  async function addPhoto(file: File) {
    await run("photo", async () =>
      jsonFetch(`/api/modules/discipline/${c.id}/photos`, { method: "POST", body: JSON.stringify({ dataUrl: await fileToCompressedDataUrl(file) }) }),
    );
    if (photoInput.current) photoInput.current.value = "";
  }

  async function remove() {
    if (!confirm(`Delete case ${c.reference} for ${c.employeeName}? All evidence and signatures will be removed. This cannot be undone.`)) return;
    await run("delete", async () => {
      await jsonFetch(`/api/modules/discipline/${c.id}`, { method: "DELETE" });
      onDeleted(c.id);
      return {};
    });
  }

  const waNotice = waLink(
    c.employeePhone,
    `Hi ${first}, ${data.company} has scheduled a disciplinary hearing for ${fmtDate(c.hearingAt, true)} at ${c.hearingVenue ?? "the office"}. Please read the notice and sign to confirm you received it:\n${c.signUrl}`,
  );
  const waOutcome = waLink(
    c.employeePhone,
    `Hi ${first}, please read your ${c.documentTitle.toLowerCase()} from ${data.company} (${c.reference}) and sign to confirm receipt:\n${c.signUrl}`,
  );

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{c.reference} · incident {fmtDate(c.incidentAt, true)}</p>
          <h3 className="text-lg font-semibold">{c.employeeName}</h3>
          <p className="text-sm text-muted-foreground">{[c.employeeNumber && `#${c.employeeNumber}`, c.jobTitle, c.department].filter(Boolean).join(" · ")}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Pill tone={STATUS_TONE[c.status] ?? "bg-muted"}>{statusLabel(c.status)}</Pill>
            {c.sanction !== "pending" && <Pill tone={SANCTION_TONE[c.sanction] ?? "bg-muted"}>{c.sanctionLabel}</Pill>}
            {c.activeWarning && <Pill tone="bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300">Active until {fmtDate(c.validUntil)}</Pill>}
            {c.appealOutcome === "upheld" && <Pill tone="bg-muted">Overturned on appeal</Pill>}
          </div>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
      </div>

      {editing ? (
        <CaseForm directory={data.directory} initial={c} submitLabel="Save changes" onSubmit={saveDetails} onCancel={() => setEditing(false)} />
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">{c.offenceLabel}{c.offenceSeverity && <span className="font-normal text-muted-foreground"> · {SEVERITY_LABEL[c.offenceSeverity]}</span>}</p>
            {c.offence && <p className="mt-1">{c.offence}</p>}
          </div>
          <p className="whitespace-pre-line text-muted-foreground">{c.description}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Place</dt><dd>{c.location ?? "-"}</dd>
            <dt className="text-muted-foreground">Witnesses</dt><dd>{c.witnesses ?? "-"}</dd>
          </dl>
          {editable && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit details</Button>}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Evidence</Label>
        <div className="flex flex-wrap gap-2">
          {c.photos.map((u) => (
            <div key={u} className="relative size-20 overflow-hidden rounded-md border">
              <a href={u} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="Evidence" className="size-full object-cover" />
              </a>
              {c.status !== "finalised" && (
                <button type="button" aria-label="Remove photo" className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  onClick={() => confirm("Remove this evidence photo?") && run("photo", () => jsonFetch(`/api/modules/discipline/${c.id}/photos`, { method: "DELETE", body: JSON.stringify({ url: u }) }))}>
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {c.photos.length < 12 && (
            <button type="button" disabled={busy === "photo"} onClick={() => photoInput.current?.click()}
              className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted">
              <Camera className="size-5" />{busy === "photo" ? "Uploading…" : "Add"}
            </button>
          )}
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); }} />
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Disciplinary history for {first}</p>
        {others.length === 0 ? (
          <p className="text-muted-foreground">No other cases on file.</p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {others.slice(0, 6).map((o) => (
              <li key={o.id} className={o.activeWarning ? "font-medium" : "text-muted-foreground"}>
                {fmtDate(o.incidentAt)} · {o.offenceLabel} · {o.status === "withdrawn" ? "Withdrawn" : o.sanctionLabel}
                {o.activeWarning ? ` (active until ${fmtDate(o.validUntil)})` : ""}
              </li>
            ))}
          </ul>
        )}
        {suggestion && editable && (
          <p className="mt-2 rounded bg-background p-2">
            <strong>Suggested:</strong> {sanctionLabel(suggestion.sanction)}{suggestion.hearing ? " after a disciplinary hearing" : ""}. <span className="text-muted-foreground">{suggestion.why}</span>
          </p>
        )}
      </div>

      {(editable || c.hearingAt) && c.status !== "withdrawn" && (
        <HearingStep c={c} busy={busy} run={run} patch={patch} waNotice={isWaPhone(c.employeePhone) ? waNotice : null} recommended={!!suggestion?.hearing} />
      )}

      {(editable || c.status === "issued") && (
        <OutcomeStep c={c} data={data} busy={busy} run={run} patch={patch} suggested={suggestion?.sanction ?? null} />
      )}

      {c.status === "issued" && <SignStep c={c} busy={busy} run={run} patch={patch} wa={isWaPhone(c.employeePhone) ? waOutcome : null} />}

      {c.status === "finalised" && (
        <section className="space-y-1 border-t pt-4 text-sm">
          <h4 className="font-medium">Outcome</h4>
          <p>{c.finding === "not_guilty" ? "Not guilty" : "Guilty"} · <strong>{c.sanctionLabel}</strong> · issued {fmtDate(c.sanctionDate)} by {c.issuedBy ?? "-"}</p>
          {c.validUntil && <p>Valid until {fmtDate(c.validUntil)}</p>}
          {c.outcomeReasons && <p className="whitespace-pre-line text-muted-foreground">{c.outcomeReasons}</p>}
          <p>
            {c.refusedToSign
              ? `Employee refused to sign — witnessed by ${c.witnessName} on ${fmtDate(c.employeeSignedAt, true)}`
              : c.employeeSignedAt ? `Employee signed ${fmtDate(c.employeeSignedAt, true)}` : "Legacy record"}
          </p>
          {c.employeeComment && <p className="rounded bg-muted p-2"><span className="text-muted-foreground">Employee&apos;s comment:</span> {c.employeeComment}</p>}
        </section>
      )}

      {(c.status === "issued" || c.status === "finalised") && c.sanction !== "pending" && c.sanction !== "not_guilty" && (
        <AppealStep c={c} busy={busy} run={run} patch={patch} />
      )}

      {c.status === "withdrawn" && (
        <section className="space-y-2 border-t pt-4 text-sm">
          <p><strong>Withdrawn:</strong> {c.withdrawnReason}</p>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("reopen", () => patch({ action: "reopen" }), "Case reopened")}><RotateCcw className="size-4" />Reopen case</Button>
        </section>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {c.sanction !== "pending" && (
          <Button asChild size="sm" variant="outline"><a href={`/api/modules/discipline/${c.id}/pdf`} target="_blank" rel="noreferrer"><FileText className="size-4" />{c.documentTitle}</a></Button>
        )}
        {c.hearingAt && (
          <Button asChild size="sm" variant="outline"><a href={`/api/modules/discipline/${c.id}/pdf?doc=notice`} target="_blank" rel="noreferrer"><FileText className="size-4" />Hearing notice</a></Button>
        )}
        <Button asChild size="sm" variant="outline">
          <a href={`/api/modules/discipline/history?employee=${encodeURIComponent(c.employeeKey)}`} target="_blank" rel="noreferrer"><FileText className="size-4" />Full record (CCMA)</a>
        </Button>
        {c.status !== "withdrawn" && c.status !== "finalised" && (
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => {
            const reason = prompt("Why is this case being withdrawn?");
            if (reason && reason.trim().length >= 3) run("withdraw", () => patch({ action: "withdraw", reason }), "Case withdrawn");
          }}>Withdraw</Button>
        )}
        {data.canManage && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled={!!busy} onClick={remove}><Trash2 className="size-4" />Delete</Button>
        )}
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {ok && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">{ok}</p>}
    </div>
  );
}

type StepProps = {
  c: Case;
  busy: string | null;
  run: (key: string, fn: () => Promise<{ case?: Case }>, okText?: string) => Promise<boolean>;
  patch: (body: object) => Promise<{ case: Case }>;
};

function HearingStep({ c, busy, run, patch, waNotice, recommended }: StepProps & { waNotice: string | null; recommended: boolean }) {
  const [open, setOpen] = useState(!c.hearingAt && recommended);
  const [v, setV] = useState({
    hearingAt: c.hearingAt ? localDateTime(c.hearingAt) : "",
    hearingVenue: c.hearingVenue ?? "",
    chairperson: c.chairperson ?? "",
  });
  const [ack, setAck] = useState<string | null>(null);
  const [openedAt] = useState(() => Date.now());
  const shortNotice = v.hearingAt && new Date(`${v.hearingAt}:00+02:00`).getTime() - openedAt < 48 * 3600_000;
  const editable = c.status === "open" || c.status === "hearing";

  return (
    <section className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Disciplinary hearing</h4>
        {editable && c.hearingAt && !open && <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Reschedule</Button>}
      </div>
      {c.hearingAt && !open && (
        <div className="space-y-2 text-sm">
          <p>{fmtDate(c.hearingAt, true)} · {c.hearingVenue} · Chair: {c.chairperson}</p>
          <p className={c.noticeAckAt ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}>
            {c.noticeAckAt ? `Employee acknowledged the notice ${fmtDate(c.noticeAckAt, true)}` : "Employee has not acknowledged the notice yet"}
          </p>
          {c.status === "hearing" && !c.noticeAckAt && (
            <div className="flex flex-wrap gap-2">
              {waNotice && (
                <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
                  <a href={waNotice} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />Send notice on WhatsApp</a>
                </Button>
              )}
              {c.signUrl && <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(c.signUrl!)}>Copy link</Button>}
            </div>
          )}
          {c.status === "hearing" && !c.noticeAckAt && (
            <details className="rounded-md border p-2">
              <summary className="cursor-pointer text-sm">Employee is here — sign on this device</summary>
              <div className="mt-2 space-y-2">
                <SignaturePad onChange={setAck} height={130} />
                <Button size="sm" disabled={!ack || !!busy} onClick={() => run("ack", () => patch({ action: "ack_notice", signature: ack }), "Notice acknowledged")}>Save acknowledgement</Button>
              </div>
            </details>
          )}
        </div>
      )}
      {!c.hearingAt && !open && editable && (
        <p className="text-sm text-muted-foreground">
          {recommended ? "A hearing is required for this case. " : "Optional for warnings. Required before dismissal. "}
          <button type="button" className="text-primary underline" onClick={() => setOpen(true)}>Schedule hearing</button>
        </p>
      )}
      {open && editable && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="dh-at">Date and time</Label>
              <Input id="dh-at" type="datetime-local" min={localDateTime()} value={v.hearingAt} onChange={(e) => setV({ ...v, hearingAt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dh-venue">Venue</Label>
              <Input id="dh-venue" maxLength={200} value={v.hearingVenue} onChange={(e) => setV({ ...v, hearingVenue: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dh-chair">Chairperson</Label>
              <Input id="dh-chair" maxLength={120} value={v.chairperson} onChange={(e) => setV({ ...v, chairperson: e.target.value })} />
            </div>
          </div>
          {shortNotice && <p className="text-xs text-amber-700 dark:text-amber-400">Less than 48 hours&apos; notice. Give the employee reasonable time to prepare.</p>}
          <p className="text-xs text-muted-foreground">The chairperson should be impartial — not the person who brought the charge.</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={!!busy || !v.hearingAt} onClick={async () => { if (await run("hearing", () => patch({ action: "schedule_hearing", ...v }), "Hearing scheduled — send the notice to the employee")) setOpen(false); }}>
              {busy === "hearing" ? "Saving…" : "Save & issue notice"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function OutcomeStep({ c, data, busy, run, patch, suggested }: StepProps & { data: DisciplineData; suggested: SanctionKey | null }) {
  const [open, setOpen] = useState(false);
  const defaultSanction = (c.sanction !== "pending" && c.sanction !== "not_guilty" ? c.sanction : suggested ?? "written") as SanctionKey;
  const [v, setV] = useState({
    finding: (c.finding ?? "guilty") as "guilty" | "not_guilty",
    sanction: defaultSanction,
    sanctionDate: c.sanctionDate ?? todayKey(),
    mitigating: c.mitigating ?? "",
    aggravating: c.aggravating ?? "",
    outcomeReasons: c.outcomeReasons ?? "",
    issuedBy: c.issuedBy ?? data.settings.defaultIssuer ?? data.me,
    validMonths: "",
  });
  const [sig, setSig] = useState<string | null>(null);
  const defMonths = { verbal: data.settings.verbalMonths, written: data.settings.writtenMonths, final: data.settings.finalMonths }[v.sanction as "verbal"];

  if (!open) {
    return (
      <section className="border-t pt-4">
        <h4 className="font-medium">Outcome</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          {c.status === "issued" ? `${c.sanctionLabel} issued ${fmtDate(c.sanctionDate)}. ` : "Record the finding and sanction once the facts (and hearing, if any) are done. "}
          <button type="button" className="text-primary underline" onClick={() => setOpen(true)}>{c.status === "issued" ? "Change outcome" : "Record outcome"}</button>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 border-t pt-4">
      <h4 className="font-medium">Outcome</h4>
      <div className="flex gap-2">
        {(["guilty", "not_guilty"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setV({ ...v, finding: f })}
            className={`flex-1 rounded-md border p-2 text-sm ${v.finding === f ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}>
            {f === "guilty" ? "Guilty" : "Not guilty"}
          </button>
        ))}
      </div>
      {v.finding === "guilty" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="do-s">Sanction</Label>
            <select id="do-s" className={selectClass} value={v.sanction} onChange={(e) => setV({ ...v, sanction: e.target.value as SanctionKey })}>
              {SANCTIONS.filter((s) => s.key !== "not_guilty").map((s) => (
                <option key={s.key} value={s.key} disabled={s.key === "dismissal" && !c.hearingAt}>
                  {s.label}{s.key === suggested ? " (suggested)" : ""}{s.key === "dismissal" && !c.hearingAt ? " — hearing required" : ""}
                </option>
              ))}
            </select>
          </div>
          {isWarning(v.sanction) && (
            <div className="space-y-1.5">
              <Label htmlFor="do-m">Valid for (months)</Label>
              <Input id="do-m" type="number" min={1} max={36} placeholder={String(defMonths)} value={v.validMonths} onChange={(e) => setV({ ...v, validMonths: e.target.value })} />
            </div>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="do-d">Date of outcome</Label>
          <Input id="do-d" type="date" max={todayKey()} value={v.sanctionDate} onChange={(e) => setV({ ...v, sanctionDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="do-by">Issued by</Label>
          <Input id="do-by" maxLength={120} value={v.issuedBy} onChange={(e) => setV({ ...v, issuedBy: e.target.value })} />
        </div>
      </div>
      {v.finding === "guilty" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="do-mit">Mitigating factors</Label>
            <textarea id="do-mit" className={textareaClass} maxLength={2000} placeholder="Years of service, clean record, remorse…" value={v.mitigating} onChange={(e) => setV({ ...v, mitigating: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="do-agg">Aggravating factors</Label>
            <textarea id="do-agg" className={textareaClass} maxLength={2000} placeholder="Previous warnings, position of trust, no remorse…" value={v.aggravating} onChange={(e) => setV({ ...v, aggravating: e.target.value })} />
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="do-r">Reasons for the decision</Label>
        <textarea id="do-r" className={textareaClass} maxLength={4000} value={v.outcomeReasons} onChange={(e) => setV({ ...v, outcomeReasons: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Signature of the person issuing (optional)</Label>
        <SignaturePad onChange={setSig} height={120} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!!busy} onClick={async () => {
          const okd = await run("outcome", () => patch({
            action: "outcome",
            finding: v.finding,
            sanction: v.finding === "not_guilty" ? "not_guilty" : v.sanction,
            sanctionDate: v.sanctionDate,
            mitigating: v.mitigating,
            aggravating: v.aggravating,
            outcomeReasons: v.outcomeReasons,
            issuedBy: v.issuedBy,
            issuerSignature: sig,
            validMonths: v.validMonths ? Number(v.validMonths) : null,
          }), "Outcome issued — now get the employee's signature");
          if (okd) setOpen(false);
        }}>
          {busy === "outcome" ? "Saving…" : "Issue outcome"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </section>
  );
}

function SignStep({ c, busy, run, patch, wa }: StepProps & { wa: string | null }) {
  const [mode, setMode] = useState<"here" | "refused" | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [witness, setWitness] = useState("");

  return (
    <section className="space-y-3 border-t pt-4">
      <h4 className="font-medium">Employee acknowledgement</h4>
      <p className="text-sm text-muted-foreground">The employee signs to confirm they received the {c.documentTitle.toLowerCase()}. If they refuse, a witness signs instead.</p>
      <div className="flex flex-wrap gap-2">
        {wa && (
          <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
            <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />Send to sign on WhatsApp</a>
          </Button>
        )}
        {c.signUrl && <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(c.signUrl!)}>Copy signing link</Button>}
        <Button size="sm" variant={mode === "here" ? "default" : "outline"} onClick={() => setMode(mode === "here" ? null : "here")}>Sign here now</Button>
        <Button size="sm" variant={mode === "refused" ? "default" : "outline"} onClick={() => setMode(mode === "refused" ? null : "refused")}>Employee refuses to sign</Button>
      </div>
      {mode === "here" && (
        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor="ds-c">Employee&apos;s comment (optional)</Label>
          <textarea id="ds-c" className={textareaClass} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
          <SignaturePad onChange={setSig} height={130} />
          <Button size="sm" disabled={!sig || !!busy} onClick={() => run("sign", () => patch({ action: "sign", signature: sig, comment }), "Signed and finalised")}>Save signature</Button>
        </div>
      )}
      {mode === "refused" && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm">A witness confirms the document was explained and handed to the employee, who refused to sign.</p>
          <Input placeholder="Witness full name" maxLength={120} value={witness} onChange={(e) => setWitness(e.target.value)} />
          <SignaturePad onChange={setSig} height={130} />
          <Button size="sm" disabled={!sig || witness.trim().length < 2 || !!busy}
            onClick={() => run("refused", () => patch({ action: "refused", witnessName: witness, witnessSignature: sig }), "Recorded as refused, witnessed")}>
            Save witness signature
          </Button>
        </div>
      )}
    </section>
  );
}

function AppealStep({ c, busy, run, patch }: StepProps) {
  const [open, setOpen] = useState(false);
  const [lodge, setLodge] = useState({ appealLodgedAt: todayKey(), appealGrounds: "" });
  const [dec, setDec] = useState({ appealOutcome: "dismissed" as "upheld" | "dismissed" | "varied", appealNotes: "", newSanction: "" });

  return (
    <section className="space-y-3 border-t pt-4">
      <h4 className="font-medium">Appeal</h4>
      {!c.appealLodgedAt && !open && (
        <p className="text-sm text-muted-foreground">No appeal. <button type="button" className="text-primary underline" onClick={() => setOpen(true)}>Record an appeal</button></p>
      )}
      {!c.appealLodgedAt && open && (
        <div className="space-y-2">
          <Input type="date" max={todayKey()} value={lodge.appealLodgedAt} onChange={(e) => setLodge({ ...lodge, appealLodgedAt: e.target.value })} />
          <textarea className={textareaClass} placeholder="Grounds of appeal" maxLength={4000} value={lodge.appealGrounds} onChange={(e) => setLodge({ ...lodge, appealGrounds: e.target.value })} />
          <Button size="sm" disabled={!!busy} onClick={() => run("appeal", () => patch({ action: "appeal", ...lodge }), "Appeal recorded")}>Save appeal</Button>
        </div>
      )}
      {c.appealLodgedAt && (
        <div className="space-y-2 text-sm">
          <p>Lodged {fmtDate(c.appealLodgedAt)}: {c.appealGrounds}</p>
          {c.appealOutcome ? (
            <p><strong>{{ upheld: "Upheld — sanction set aside", dismissed: "Dismissed — sanction stands", varied: `Varied — now ${c.sanctionLabel}` }[c.appealOutcome] ?? c.appealOutcome}</strong>{c.appealNotes ? ` · ${c.appealNotes}` : ""}</p>
          ) : (
            <div className="space-y-2 rounded-md border p-3">
              <select className={selectClass} value={dec.appealOutcome} onChange={(e) => setDec({ ...dec, appealOutcome: e.target.value as typeof dec.appealOutcome })}>
                <option value="dismissed">Appeal dismissed — sanction stands</option>
                <option value="upheld">Appeal upheld — sanction set aside</option>
                <option value="varied">Sanction changed</option>
              </select>
              {dec.appealOutcome === "varied" && (
                <select className={selectClass} value={dec.newSanction} onChange={(e) => setDec({ ...dec, newSanction: e.target.value })}>
                  <option value="">New sanction…</option>
                  {SANCTIONS.filter((s) => s.key !== c.sanction && s.key !== "not_guilty").map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              )}
              <textarea className={textareaClass} placeholder="Appeal chairperson's notes" maxLength={4000} value={dec.appealNotes} onChange={(e) => setDec({ ...dec, appealNotes: e.target.value })} />
              <Button size="sm" disabled={!!busy} onClick={() => run("decide", () => patch({ action: "appeal_decision", ...dec, newSanction: dec.newSanction || null }), "Appeal decided")}>Save decision</Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
