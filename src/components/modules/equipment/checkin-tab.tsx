"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Search } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { PhotoList } from "@/components/modules/photo-list";
import { CHECKLIST, CONDITIONS, OUTCOMES, label, money, type Checklist } from "@/lib/modules/equipment-options";
import { OVERDUE_TONE, Pill, fmtDate, isOpen, parseMoney, selectClass, textareaClass, type EquipData, type IssueRow } from "@/components/modules/equipment/types";

type Line = { conditionIn: string; checklist: Checklist; damageNotes: string; photos: string[]; cost: string; outcome: string; raiseDeductible: boolean };

const freshLine = (x: IssueRow): Line => ({
  conditionIn: x.conditionOut,
  checklist: Object.fromEntries(CHECKLIST.map((c) => [c.key, true])),
  damageNotes: "",
  photos: [],
  cost: "",
  outcome: "stock",
  raiseDeductible: false,
});

export function CheckInTab({ data, reload, initialPerson }: { data: EquipData; reload: () => Promise<unknown>; initialPerson: string | null }) {
  const full = data.modules.handback;
  const [person, setPerson] = useState<string | null>(initialPerson);
  const [q, setQ] = useState("");
  const items = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);
  const open = data.issues.filter(isOpen);

  const holders = useMemo(() => {
    const m = new Map<string, { name: string; count: number; overdue: number; unsigned: number }>();
    for (const x of open) {
      const k = x.employeeName.trim().toLowerCase();
      const h = m.get(k) ?? { name: x.employeeName, count: 0, overdue: 0, unsigned: 0 };
      h.count++;
      if (x.overdue) h.overdue++;
      if (x.status === "awaiting_signature") h.unsigned++;
      m.set(k, h);
    }
    const term = q.trim().toLowerCase();
    return [...m.values()]
      .filter((h) => !term || h.name.toLowerCase().includes(term) || open.some((x) => x.employeeName === h.name && [items.get(x.itemId)?.name, items.get(x.itemId)?.assetTag].some((v) => v?.toLowerCase().includes(term))))
      .sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name));
  }, [open, q, items]);

  if (!person) {
    return (
      <div className="max-w-2xl space-y-3">
        <p className="text-sm text-muted-foreground">Who is bringing equipment back?</p>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search a name, item or asset tag…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        {holders.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{open.length ? "No match." : "Nothing is signed out, so there is nothing to check in."}</p>}
        <div className="space-y-2">
          {holders.map((h) => (
            <button key={h.name} type="button" onClick={() => setPerson(h.name)} className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card p-3 text-left text-sm hover:bg-muted/50">
              <span><span className="font-medium">{h.name}</span><span className="text-muted-foreground"> · {h.count} item{h.count === 1 ? "" : "s"}</span></span>
              <span className="flex gap-1">
                {h.overdue > 0 && <Pill tone={OVERDUE_TONE}>{h.overdue} overdue</Pill>}
                {h.unsigned > 0 && <Pill tone="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">{h.unsigned} unsigned</Pill>}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return <Inspection key={person} data={data} reload={reload} person={person} back={() => setPerson(null)} full={full} />;
}

function Inspection({ data, reload, person, back, full }: { data: EquipData; reload: () => Promise<unknown>; person: string; back: () => void; full: boolean }) {
  const items = new Map(data.items.map((i) => [i.id, i]));
  const mine = data.issues.filter((x) => isOpen(x) && x.employeeName.trim().toLowerCase() === person.trim().toLowerCase());
  const [checked, setChecked] = useState<string[]>(() => mine.map((x) => x.id));
  const [lines, setLines] = useState<Record<string, Line>>(() => Object.fromEntries(mine.map((x) => [x.id, freshLine(x)])));
  const [present, setPresent] = useState(true);
  const [signer, setSigner] = useState(person);
  const [empSig, setEmpSig] = useState<string | null>(null);
  const [inspSig, setInspSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ handbackNumber: string; firstId: string; count: number } | null>(null);

  const set = (id: string, patch: Partial<Line>) => setLines((l) => ({ ...l, [id]: { ...l[id], ...patch } }));
  const flagged = (l: Line) => l.outcome !== "stock" || l.conditionIn === "damaged" || l.conditionIn === "poor" || Object.values(l.checklist).some((v) => v === false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        checked.map((id) => {
          const l = lines[id];
          return [id, {
            conditionIn: l.conditionIn,
            checklist: full ? l.checklist : {},
            damageNotes: l.damageNotes || null,
            photos: full ? l.photos : [],
            repairCost: l.cost ? parseMoney(l.cost) : null,
            outcome: l.outcome,
            raiseDeductible: full && data.modules.ledger && l.raiseDeductible,
          }];
        }),
      );
      const r = await jsonFetch<{ handbackNumber: string; issues: IssueRow[] }>("/api/modules/equipment/handback", {
        method: "POST",
        body: JSON.stringify({ issueIds: checked, lines: payload, employeePresent: present, returnSignerName: present ? signer : null, returnSignature: present ? empSig : null, inspectorSignature: inspSig }),
      });
      setDone({ handbackNumber: r.handbackNumber, firstId: r.issues[0].id, count: r.issues.length });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check in");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-green-600" />
          <div>
            <h3 className="font-semibold">{done.handbackNumber}: {done.count} item{done.count === 1 ? "" : "s"} checked in from {person}</h3>
            <p className="text-sm text-muted-foreground">The register is updated. Give {person.split(" ")[0]} a copy of the handback report.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button size="sm" variant="outline" asChild><a href={`/api/modules/equipment/issues/${done.firstId}/pdf?type=handback`} target="_blank" rel="noreferrer"><Download className="size-4" />Handback report</a></Button>
          <Button size="sm" onClick={back}>Check in someone else</Button>
        </div>
      </div>
    );
  }

  const costs = checked.reduce((a, id) => a + (parseMoney(lines[id]?.cost ?? "") ?? 0), 0);
  const ready = checked.length > 0 && !!inspSig && (!present || (!!empSig && signer.trim().length >= 3));

  return (
    <div className="space-y-4">
      <button type="button" onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Everyone with equipment</button>
      <h3 className="text-lg font-semibold">Check in from {person}</h3>
      {mine.length === 0 && <p className="text-sm text-muted-foreground">{person} has nothing signed out.</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        {mine.map((x) => {
          const it = items.get(x.itemId);
          const l = lines[x.id];
          const on = checked.includes(x.id);
          return (
            <div key={x.id} className={`space-y-3 rounded-lg border p-4 ${on ? "bg-card" : "bg-muted/30 opacity-70"}`}>
              <label className="flex cursor-pointer items-start gap-2">
                <input type="checkbox" className="mt-1 size-4" checked={on} onChange={() => setChecked((c) => (on ? c.filter((i) => i !== x.id) : [...c, x.id]))} />
                <span className="flex-1">
                  <span className="font-medium">{it?.name ?? "Item"}</span>
                  <span className="text-sm text-muted-foreground">{it?.assetTag ? ` · ${it.assetTag}` : ""}{it?.serialNumber ? ` · S/N ${it.serialNumber}` : ""}</span>
                  <span className="block text-xs text-muted-foreground">
                    {x.documentNumber} · out {fmtDate(x.issuedAt)} in {label(CONDITIONS, x.conditionOut).toLowerCase()} condition{x.accessories ? ` · with ${x.accessories}` : ""}
                  </span>
                </span>
                {x.overdue && <Pill tone={OVERDUE_TONE}>Overdue</Pill>}
              </label>
              {on && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Condition now</Label>
                      <select className={selectClass} value={l.conditionIn}
                        onChange={(e) => set(x.id, { conditionIn: e.target.value, ...(e.target.value === "damaged" && l.outcome === "stock" ? { outcome: "repair" } : {}) })}>
                        {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Outcome</Label>
                      <select className={selectClass} value={l.outcome} onChange={(e) => set(x.id, { outcome: e.target.value })}>
                        {OUTCOMES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {full && l.outcome !== "lost" && (
                    <div className="grid gap-1 sm:grid-cols-2">
                      {CHECKLIST.map((c) => (
                        <label key={c.key} className="flex items-start gap-2 text-sm">
                          <input type="checkbox" className="mt-0.5 size-4" checked={l.checklist[c.key] !== false} onChange={(e) => set(x.id, { checklist: { ...l.checklist, [c.key]: e.target.checked } })} />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  )}
                  {flagged(l) && (
                    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                      <textarea className={textareaClass} maxLength={2000} placeholder={l.outcome === "lost" ? "What happened to it?" : "Describe the damage or what is missing"} value={l.damageNotes} onChange={(e) => set(x.id, { damageNotes: e.target.value })} />
                      {full && <PhotoList value={l.photos} onChange={(p) => set(x.id, { photos: p })} max={6} label="Damage photo" />}
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                          <Label>{l.outcome === "lost" ? "Replacement cost (R)" : "Repair cost (R)"}</Label>
                          <Input inputMode="decimal" className="w-36" placeholder={l.outcome === "lost" && it?.value != null ? String(it.value) : "0.00"} value={l.cost} onChange={(e) => set(x.id, { cost: e.target.value })} />
                        </div>
                        {full && data.modules.ledger && (
                          <label className="flex items-center gap-2 pb-2 text-sm">
                            <input type="checkbox" className="size-4" checked={l.raiseDeductible} onChange={(e) => set(x.id, { raiseDeductible: e.target.checked })} />
                            Raise a deductible in the Ledger
                          </label>
                        )}
                      </div>
                      {l.raiseDeductible && !parseMoney(l.cost) && <p className="text-xs text-destructive">Enter the cost to raise a deductible.</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {mine.length > 0 && (
        <div className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="size-4" checked={present} onChange={(e) => setPresent(e.target.checked)} />
              {person} is here and agrees with the inspection
            </label>
            {present ? (
              <>
                <Input value={signer} onChange={(e) => setSigner(e.target.value)} aria-label="Employee full name" />
                <SignaturePad onChange={setEmpSig} height={130} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">The report will say the employee was not present. Give them a copy so they can respond.</p>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Inspected by {data.me}</p>
            <SignaturePad onChange={setInspSig} height={130} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            {costs > 0 && <p className="text-sm">Total repair / replacement: <strong>{money(costs)}</strong></p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={!ready || busy || checked.some((id) => lines[id].raiseDeductible && !parseMoney(lines[id].cost))} onClick={submit}>
              {busy ? "Saving…" : `Check in ${checked.length} item${checked.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
