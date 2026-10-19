"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, MessageCircle, Search, Smartphone, Tablet } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { LinkActions } from "@/components/modules/link-actions";
import { SignaturePad } from "@/components/platform/signature-pad";
import { CATEGORIES, CONDITIONS, CUSTODY_TERMS, money } from "@/lib/modules/equipment-options";
import { isWaPhone, waLink } from "@/lib/phone";
import { fmtDate, textareaClass, type EquipData, type IssueRow } from "@/components/modules/equipment/types";

export function custodyInvite(company: string, name: string, url: string, items: number, reminder = false) {
  const first = name.split(" ")[0];
  return reminder
    ? `Hi ${first}, a reminder from ${company}: please sign for the equipment you received:\n${url}`
    : `Hi ${first}, ${company} has issued ${items === 1 ? "an item" : `${items} items`} to you. Please check the list and sign for custody:\n${url}`;
}

export function IssueTab({ data, reload, initialPerson }: { data: EquipData; reload: () => Promise<unknown>; initialPerson: string | null }) {
  const known = (n: string) => data.directory.find((p) => p.name.toLowerCase() === n.trim().toLowerCase());
  const start = initialPerson ? known(initialPerson) : undefined;
  const [name, setName] = useState(initialPerson ?? "");
  const [number, setNumber] = useState(start?.employeeNumber ?? "");
  const [phone, setPhone] = useState(start?.phone ?? "");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [due, setDue] = useState("");
  const [accessories, setAccessories] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"in_person" | "link">("in_person");
  const [signerName, setSignerName] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ documentNumber: string; issues: IssueRow[]; method: string; name: string; phone: string } | null>(null);

  const available = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.items.filter(
      (i) => i.status === "available" && (cat === "all" || i.category === cat) && (!term || [i.name, i.assetTag, i.serialNumber, i.location].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [data.items, q, cat]);
  const byId = new Map(data.items.map((i) => [i.id, i]));
  const holding = data.issues.filter((x) => (x.status === "active" || x.status === "awaiting_signature") && name.trim() && x.employeeName.toLowerCase() === name.trim().toLowerCase());

  function pickName(v: string) {
    setName(v);
    const p = known(v);
    if (p) {
      if (p.employeeNumber) setNumber(p.employeeNumber);
      if (p.phone) setPhone(p.phone);
    }
  }
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await jsonFetch<{ documentNumber: string; issues: IssueRow[] }>("/api/modules/equipment/issues", {
        method: "POST",
        body: JSON.stringify({
          itemIds: selected,
          employeeName: name,
          employeeNumber: number || null,
          employeePhone: phone || null,
          dueBackAt: due || null,
          accessories: accessories || null,
          notesOut: notes || null,
          conditions,
          method,
          signerName: method === "in_person" ? (signerName ?? name) : null,
          signature: method === "in_person" ? signature : null,
          agree: method === "in_person" ? agree : undefined,
        }),
      });
      setResult({ ...r, method, name, phone });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const first = result.issues[0];
    const text = custodyInvite(data.company, result.name, first.signingUrl, result.issues.length);
    return (
      <div className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-green-600" />
          <div>
            <h3 className="font-semibold">{result.documentNumber}: {result.issues.length} item{result.issues.length === 1 ? "" : "s"} issued to {result.name}</h3>
            <p className="text-sm text-muted-foreground">
              {result.method === "in_person" ? "Signed on screen. The custody document is ready." : "Send the link below. The items show as awaiting signature until they sign."}
            </p>
          </div>
        </div>
        {result.method === "link" && (
          <div className="space-y-2">
            <LinkActions url={first.signingUrl} title={`Equipment custody - ${result.name}`}>
              <Button size="sm" asChild className="bg-green-600 text-white hover:bg-green-700">
                <a href={waLink(result.phone, text)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp{isWaPhone(result.phone) ? "" : "…"}</a>
              </Button>
            </LinkActions>
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/modules/equipment/issues/${first.id}/pdf`} target="_blank" rel="noreferrer"><Download className="size-4" />Custody PDF</a>
          </Button>
          <Button size="sm" onClick={() => { setResult(null); setSelected([]); setConditions({}); setSignature(null); setAgree(false); setName(""); setNumber(""); setPhone(""); setSignerName(null); setDue(""); setAccessories(""); setNotes(""); }}>
            Issue more
          </Button>
        </div>
      </div>
    );
  }

  const ready = name.trim().length >= 2 && selected.length > 0 && (method === "link" || (agree && !!signature && (signerName ?? name).trim().length >= 3));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">1. Who is receiving it?</h3>
        <div className="space-y-1.5">
          <Label htmlFor="eq-name">Employee name</Label>
          <Input id="eq-name" list="eq-people" value={name} onChange={(e) => pickName(e.target.value)} placeholder="Start typing a name" autoComplete="off" />
          <datalist id="eq-people">{data.directory.map((p) => <option key={p.name} value={p.name} />)}</datalist>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="eq-no">Employee number</Label><Input id="eq-no" value={number} onChange={(e) => setNumber(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="eq-ph">Cellphone</Label><Input id="eq-ph" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="For WhatsApp" /></div>
        </div>
        {holding.length > 0 && (
          <p className="rounded-md bg-blue-50 p-2 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            Already holds: {holding.map((x) => byId.get(x.itemId)?.name ?? "item").join(", ")}
          </p>
        )}

        <h3 className="pt-2 font-semibold">2. What are they getting?</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, tag, serial…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="h-9 max-w-44 rounded-md border bg-background px-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1">
          {available.length === 0 && <p className="p-3 text-center text-sm text-muted-foreground">{data.items.some((i) => i.status === "available") ? "No match." : "Nothing in store. Add equipment in the Register tab."}</p>}
          {available.slice(0, 200).map((i) => (
            <label key={i.id} className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted ${selected.includes(i.id) ? "bg-primary/5" : ""}`}>
              <input type="checkbox" className="size-4" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} />
              <span className="flex-1">{i.name}<span className="text-muted-foreground">{i.assetTag ? ` · ${i.assetTag}` : ""}{i.serialNumber ? ` · S/N ${i.serialNumber}` : ""}</span></span>
              {i.value != null && <span className="text-xs text-muted-foreground">{money(i.value)}</span>}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">3. Condition and terms</h3>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tick the items on the left.</p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((id) => {
              const i = byId.get(id)!;
              return (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{i.name}{i.assetTag ? ` · ${i.assetTag}` : ""}</span>
                  <select className="h-8 rounded-md border bg-background px-2 text-sm" value={conditions[id] ?? i.condition} onChange={(e) => setConditions({ ...conditions, [id]: e.target.value })} aria-label={`Condition of ${i.name}`}>
                    {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="eq-due">Return by (optional)</Label><Input id="eq-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="eq-acc">Accessories</Label><Input id="eq-acc" value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder="Charger, bag, 2 batteries" /></div>
        </div>
        <textarea className={textareaClass} placeholder="Notes (optional)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />

        <div className="grid grid-cols-2 gap-2">
          {([["in_person", Tablet, "Sign now on this device"], ["link", Smartphone, "Send a link to their phone"]] as const).map(([key, Icon, text]) => (
            <button key={key} type="button" onClick={() => setMethod(key)}
              className={`flex items-center gap-2 rounded-md border p-2 text-left text-sm ${method === key ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"}`}>
              <Icon className="size-4 shrink-0" />{text}
            </button>
          ))}
        </div>

        {method === "in_person" && (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">Hand the device to {name.trim() || "the employee"} to read and sign</p>
            <ol className="max-h-40 list-decimal space-y-1 overflow-y-auto pl-5 text-xs text-muted-foreground">
              {CUSTODY_TERMS.map((t) => <li key={t}>{t}</li>)}
            </ol>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I received the items listed in the condition shown and accept the custody terms.
            </label>
            <div className="space-y-1.5"><Label htmlFor="eq-sn">Full name</Label><Input id="eq-sn" value={signerName ?? name} onChange={(e) => setSignerName(e.target.value)} /></div>
            <SignaturePad onChange={setSignature} height={140} />
          </div>
        )}
        {due && <p className="text-xs text-muted-foreground">Due back {fmtDate(due)}. It shows as overdue after that.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={!ready || busy} onClick={submit}>
          {busy ? "Saving…" : `Issue ${selected.length || ""} item${selected.length === 1 ? "" : "s"}${method === "link" ? " and get link" : ""}`}
        </Button>
      </section>
    </div>
  );
}
