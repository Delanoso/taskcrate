"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Circle, FileText, Lock, Trash2, Upload } from "lucide-react";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { fileToCompressedDataUrl } from "@/lib/image-compress";
import { ACCOUNT_TYPES, BANKS, parseSaId, type Personal } from "@/lib/modules/onboard-items";

type Req = { key: string; label: string; hint: string; files: { id: string; fileName: string; mimeType: string; sizeBytes: number }[] };
type Pack = {
  company: string;
  employeeName: string;
  jobTitle: string | null;
  startDate: string | null;
  status: string;
  editable: boolean;
  reviewNote: string | null;
  requirements: Req[];
  personal: Personal | null;
  defaults: { cellphone: string | null; email: string | null };
  bank: { bankName: string; accountHolder: string; accountType: string; branchCode: string; accountMasked: string } | null;
  progress: { done: number; total: number; percent: number; missing: string[] };
  consentName: string | null;
  submittedAt: string | null;
};

const STEPS = ["Your details", "Bank", "Documents", "Sign & submit"] as const;
const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const api = (token: string, path = "") => `/api/modules/onboard/public/${token}${path}`;

async function send(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "Something went wrong. Please try again.");
  return d;
}

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [pack, setPack] = useState<Pack | null>(null);
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState(0);
  const first = useRef(true);

  const load = useCallback(
    () =>
      fetch(api(token))
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((p: Pack) => {
          setPack(p);
          if (first.current) {
            first.current = false;
            setStep(!p.personal ? 0 : !p.bank ? 1 : p.progress.missing.length ? 2 : 3);
          }
        })
        .catch(() => setMissing(true)),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <Box><h1 className="text-lg font-semibold">Link not available</h1><p className="mt-1 text-sm text-muted-foreground">This onboarding link is no longer valid. Please contact the company that sent it.</p></Box>;
  if (!pack) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!pack.editable) {
    const approved = pack.status === "approved";
    return (
      <Box>
        <p className="text-sm text-muted-foreground">{pack.company}</p>
        <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-12 text-green-600" />
          <h1 className="text-xl font-semibold">{approved ? "You're all set" : "Thank you, your pack has been submitted"}</h1>
          <p className="text-sm text-muted-foreground">
            {approved
              ? `${pack.company} has approved your onboarding documents.`
              : `${pack.company} will review your details. If anything needs fixing they will let you know and this link will open again.`}
          </p>
          {pack.startDate && <p className="text-sm">Start date: <strong>{fmtDate(pack.startDate)}</strong></p>}
        </div>
      </Box>
    );
  }

  const stepDone = [!!pack.personal, !!pack.bank, pack.progress.missing.length === 0, false];

  return (
    <div className="space-y-4">
      <Box>
        <p className="text-sm text-muted-foreground">{pack.company}</p>
        <h1 className="text-xl font-semibold">Welcome, {pack.employeeName.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete your new-employee pack{pack.jobTitle ? ` for the ${pack.jobTitle} position` : ""}{pack.startDate ? `, starting ${fmtDate(pack.startDate)}` : ""}. Your progress is saved after every step.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" />Your ID and bank details are encrypted and only visible to authorised staff.</p>
        {pack.status === "changes_requested" && pack.reviewNote && (
          <div className="mt-3 flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div><p className="font-medium">Please fix the following and submit again:</p><p className="whitespace-pre-line">{pack.reviewNote}</p></div>
          </div>
        )}
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pack.progress.percent}%` }} /></div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {STEPS.map((label, i) => (
              <button key={label} type="button" onClick={() => setStep(i)}
                className={`flex flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center text-xs ${step === i ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {stepDone[i] ? <CheckCircle2 className="size-4 text-green-600" /> : <Circle className="size-4" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </Box>

      <Box>
        {step === 0 && <PersonalStep token={token} pack={pack} onSaved={() => load().then(() => setStep(1))} />}
        {step === 1 && <BankStep token={token} pack={pack} onSaved={() => load().then(() => setStep(2))} />}
        {step === 2 && <DocumentsStep token={token} pack={pack} reload={load} onNext={() => setStep(3)} />}
        {step === 3 && <SubmitStep token={token} pack={pack} onDone={load} goTo={setStep} />}
      </Box>
    </div>
  );
}

function PersonalStep({ token, pack, onSaved }: { token: string; pack: Pack; onSaved: () => void }) {
  const p = pack.personal;
  const [v, setV] = useState({
    firstNames: p?.firstNames ?? "",
    surname: p?.surname ?? "",
    preferredName: p?.preferredName ?? "",
    idType: (p?.idType ?? "sa_id") as "sa_id" | "passport",
    idNumber: p?.idNumber ?? "",
    passportCountry: p?.passportCountry ?? "",
    dateOfBirth: p?.dateOfBirth ?? "",
    gender: p?.gender ?? "",
    nationality: p?.nationality ?? "South African",
    cellphone: p?.cellphone ?? pack.defaults.cellphone ?? "",
    email: p?.email ?? pack.defaults.email ?? "",
    homeAddress: p?.homeAddress ?? "",
    postalCode: p?.postalCode ?? "",
    taxNumber: p?.taxNumber ?? "",
    emergencyName: p?.emergencyName ?? "",
    emergencyRelationship: p?.emergencyRelationship ?? "",
    emergencyPhone: p?.emergencyPhone ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const id = v.idType === "sa_id" && v.idNumber.replace(/\s/g, "").length === 13 ? parseSaId(v.idNumber) : null;

  function onId(value: string) {
    const r = v.idType === "sa_id" ? parseSaId(value) : null;
    set(r?.valid ? { idNumber: value, dateOfBirth: r.dateOfBirth, gender: r.gender } : { idNumber: value });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send(api(token), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "personal", data: v }) });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <h2 className="font-semibold">Personal details</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First names" id="fn"><Input id="fn" required value={v.firstNames} onChange={(e) => set({ firstNames: e.target.value })} autoComplete="given-name" /></Field>
        <Field label="Surname" id="sn"><Input id="sn" required value={v.surname} onChange={(e) => set({ surname: e.target.value })} autoComplete="family-name" /></Field>
        <Field label="Known as (optional)" id="pn"><Input id="pn" value={v.preferredName} onChange={(e) => set({ preferredName: e.target.value })} /></Field>
        <Field label="Identity document" id="it">
          <select id="it" className={selectClass} value={v.idType} onChange={(e) => set({ idType: e.target.value as "sa_id" | "passport" })}>
            <option value="sa_id">South African ID</option>
            <option value="passport">Passport</option>
          </select>
        </Field>
        <Field label={v.idType === "sa_id" ? "ID number" : "Passport number"} id="idn">
          <Input id="idn" required inputMode={v.idType === "sa_id" ? "numeric" : "text"} value={v.idNumber} onChange={(e) => onId(e.target.value)} />
          {id && <p className={`text-xs ${id.valid ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>{id.valid ? `Valid ID · ${id.citizen}` : id.reason}</p>}
        </Field>
        {v.idType === "passport" && <Field label="Issuing country" id="pc"><Input id="pc" required value={v.passportCountry} onChange={(e) => set({ passportCountry: e.target.value })} /></Field>}
        <Field label="Date of birth" id="dob"><Input id="dob" type="date" required value={v.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} /></Field>
        <Field label="Gender" id="g">
          <select id="g" className={selectClass} value={v.gender} onChange={(e) => set({ gender: e.target.value })}>
            <option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option>
          </select>
        </Field>
        <Field label="Nationality" id="nat"><Input id="nat" value={v.nationality} onChange={(e) => set({ nationality: e.target.value })} /></Field>
        <Field label="SARS tax number (if you have one)" id="tax"><Input id="tax" inputMode="numeric" maxLength={10} value={v.taxNumber} onChange={(e) => set({ taxNumber: e.target.value.replace(/\D/g, "") })} /></Field>
        <Field label="Cellphone" id="cell"><Input id="cell" type="tel" required value={v.cellphone} onChange={(e) => set({ cellphone: e.target.value })} autoComplete="tel" /></Field>
        <Field label="Email (optional)" id="em"><Input id="em" type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Home address" id="addr"><textarea id="addr" required minLength={5} maxLength={400} className="min-h-16 w-full rounded-md border bg-background p-2 text-sm" value={v.homeAddress} onChange={(e) => set({ homeAddress: e.target.value })} autoComplete="street-address" /></Field>
        <Field label="Postal code" id="pcode"><Input id="pcode" inputMode="numeric" maxLength={10} value={v.postalCode} onChange={(e) => set({ postalCode: e.target.value })} /></Field>
      </div>
      <h2 className="border-t pt-4 font-semibold">Emergency contact</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" id="ecn"><Input id="ecn" required value={v.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} /></Field>
        <Field label="Relationship" id="ecr"><Input id="ecr" required placeholder="e.g. Mother" value={v.emergencyRelationship} onChange={(e) => set({ emergencyRelationship: e.target.value })} /></Field>
        <Field label="Phone" id="ecp"><Input id="ecp" type="tel" required value={v.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value })} /></Field>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</Button>
    </form>
  );
}

function BankStep({ token, pack, onSaved }: { token: string; pack: Pack; onSaved: () => void }) {
  const b = pack.bank;
  const known = BANKS.some((x) => x.name === b?.bankName);
  const [bank, setBank] = useState(b ? (known ? b.bankName : "Other") : "");
  const [other, setOther] = useState(b && !known ? b.bankName : "");
  const [v, setV] = useState({
    accountHolder: b?.accountHolder ?? (pack.personal ? `${pack.personal.firstNames} ${pack.personal.surname}` : ""),
    accountNumber: "",
    accountType: b?.accountType ?? "Savings",
    branchCode: b?.branchCode ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickBank(name: string) {
    setBank(name);
    const code = BANKS.find((x) => x.name === name)?.code;
    if (code) setV((x) => ({ ...x, branchCode: code }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = { ...v, bankName: bank === "Other" ? other : bank };
      await send(api(token), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "bank", data }) });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <h2 className="font-semibold">Bank details for your salary</h2>
      {b && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm">
          <span>Saved: {b.bankName} · {b.accountType} · account {b.accountMasked}. To change it, enter the details again below.</span>
          <Button type="button" size="sm" variant="outline" onClick={onSaved}>Keep and continue</Button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bank" id="bk">
          <select id="bk" required className={selectClass} value={bank} onChange={(e) => pickBank(e.target.value)}>
            <option value="">Choose your bank…</option>
            {BANKS.map((x) => <option key={x.name}>{x.name}</option>)}
            <option>Other</option>
          </select>
        </Field>
        {bank === "Other" && <Field label="Bank name" id="bko"><Input id="bko" required value={other} onChange={(e) => setOther(e.target.value)} /></Field>}
        <Field label="Account holder" id="ah"><Input id="ah" required value={v.accountHolder} onChange={(e) => setV({ ...v, accountHolder: e.target.value })} /></Field>
        <Field label="Account number" id="an">
          <Input id="an" required inputMode="numeric" autoComplete="off" value={v.accountNumber} onChange={(e) => setV({ ...v, accountNumber: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Account type" id="at">
          <select id="at" className={selectClass} value={v.accountType} onChange={(e) => setV({ ...v, accountType: e.target.value })}>
            {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Branch code" id="bc">
          <Input id="bc" required inputMode="numeric" maxLength={6} value={v.branchCode} onChange={(e) => setV({ ...v, branchCode: e.target.value.replace(/\D/g, "") })} />
          {BANKS.some((x) => x.name === bank) && <p className="text-xs text-muted-foreground">Universal branch code filled in for you.</p>}
        </Field>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</Button>
    </form>
  );
}

async function toUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;
  const dataUrl = await fileToCompressedDataUrl(file, { maxDim: 2200, quality: 0.85 });
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

function DocumentsStep({ token, pack, reload, onNext }: { token: string; pack: Pack; reload: () => Promise<void>; onNext: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(key: string, list: FileList | null) {
    if (!list?.length) return;
    setBusy(key);
    setError(null);
    try {
      const form = new FormData();
      form.set("itemKey", key);
      for (const f of Array.from(list)) form.append("file", await toUpload(f));
      await send(api(token, "/documents"), { method: "POST", body: form });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await send(api(token, `/documents/${id}`), { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Documents</h2>
        <p className="text-sm text-muted-foreground">Take a clear photo with your phone or upload a PDF. Make sure all four corners are visible.</p>
      </div>
      <ul className="space-y-3">
        {pack.requirements.map((r) => (
          <li key={r.key} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {r.files.length ? <CheckCircle2 className="size-4 text-green-600" /> : <Circle className="size-4 text-muted-foreground" />}
                  {r.label}
                </p>
                {r.hint && <p className="mt-0.5 text-xs text-muted-foreground">{r.hint}</p>}
              </div>
              <label className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted ${busy === r.key ? "pointer-events-none opacity-60" : ""}`}>
                <Upload className="size-3.5" />{busy === r.key ? "Uploading…" : r.files.length ? "Add page" : "Upload"}
                <input type="file" className="sr-only" accept="image/*,application/pdf" multiple onChange={(e) => { upload(r.key, e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            {r.files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {r.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-xs">
                    <FileText className="size-3.5 shrink-0" />
                    <a className="truncate underline" href={api(token, `/documents/${f.id}`)} target="_blank" rel="noreferrer">{f.fileName}</a>
                    <span className="shrink-0 text-muted-foreground">{Math.max(1, Math.round(f.sizeBytes / 1024))} KB</span>
                    <button type="button" className="ml-auto text-muted-foreground hover:text-destructive" disabled={!!busy} onClick={() => remove(f.id)} aria-label={`Remove ${f.fileName}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={onNext}>Continue</Button>
    </div>
  );
}

function SubmitStep({ token, pack, onDone, goTo }: { token: string; pack: Pack; onDone: () => void; goTo: (s: number) => void }) {
  const [name, setName] = useState(pack.consentName ?? (pack.personal ? `${pack.personal.firstNames} ${pack.personal.surname}` : pack.employeeName));
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gaps = [!pack.personal && { label: "Personal details", step: 0 }, !pack.bank && { label: "Bank details", step: 1 }, ...pack.progress.missing.map((m) => ({ label: m, step: 2 }))].filter(
    (x): x is { label: string; step: number } => !!x,
  );

  async function submit() {
    if (!signature) return setError("Please sign in the box.");
    setBusy(true);
    setError(null);
    try {
      await send(api(token, "/submit"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consentName: name, agree, signature }) });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Declaration</h2>
      {gaps.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Still to do before you can submit:</p>
          <ul className="mt-1 list-disc pl-5">
            {gaps.map((g) => <li key={g.label}><button type="button" className="underline" onClick={() => goTo(g.step)}>{g.label}</button></li>)}
          </ul>
        </div>
      )}
      <p className="rounded-md bg-muted/50 p-3 text-sm">
        I confirm that the information and documents I supplied are true and correct. I consent to {pack.company} processing my personal information for employment,
        payroll, tax, benefits and legal compliance purposes, in line with the Protection of Personal Information Act (POPIA).
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        I agree to the declaration above
      </label>
      <Field label="Full name" id="cn"><Input id="cn" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="space-y-1.5"><Label>Signature</Label><SignaturePad onChange={setSignature} /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={busy || !agree || gaps.length > 0} onClick={submit}>{busy ? "Submitting…" : "Submit my pack"}</Button>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-5 shadow-sm">{children}</div>;
}

const fmtDate = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
