"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileUp, Plus, Search } from "lucide-react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import { CATEGORIES, CONDITIONS, ITEM_STATUS, label, money } from "@/lib/modules/equipment-options";
import { readXlsx } from "@/lib/xlsx-read";
import { textToRows } from "@/components/modules/leave/import";
import { ItemDetail, ItemForm, draftBody, emptyDraft, type ItemDraft } from "@/components/modules/equipment/item-detail";
import { ITEM_TONE, Pill, downloadCsv, isOpen, parseItemRows, textareaClass, type ImportItem, type TabProps } from "@/components/modules/equipment/types";

const STATUSES = ["all", ...Object.keys(ITEM_STATUS)] as const;

export function RegisterTab({ data, reload, go }: TabProps) {
  const [status, setStatus] = useState<string>("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"add" | "import" | null>(() => (data.items.length ? null : "add"));
  const holders = useMemo(() => new Map(data.issues.filter(isOpen).map((x) => [x.itemId, x.employeeName])), [data.issues]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.items.filter(
      (i) => (status === "all" || i.status === status) && (cat === "all" || i.category === cat) &&
        (!term || [i.name, i.assetTag, i.serialNumber, i.location, holders.get(i.id)].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [data.items, status, cat, q, holders]);
  const total = rows.reduce((a, i) => a + (i.value ?? 0), 0);

  function exportCsv() {
    downloadCsv(
      "equipment-register.csv",
      ["Asset tag", "Item", "Category", "Serial number", "Value", "Condition", "Status", "Held by", "Location", "Notes"],
      rows.map((i) => [i.assetTag, i.name, label(CATEGORIES, i.category), i.serialNumber, i.value, label(CONDITIONS, i.condition), ITEM_STATUS[i.status as keyof typeof ITEM_STATUS], holders.get(i.id) ?? "", i.location, i.notes]),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-sm ${status === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {s === "all" ? "All" : ITEM_STATUS[s as keyof typeof ITEM_STATUS]} <span className="opacity-70">{s === "all" ? data.items.length : data.items.filter((i) => i.status === s).length}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search item, tag, serial, holder…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-9 max-w-48 rounded-md border bg-background px-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <Button size="sm" variant="outline" className="h-9" disabled={!rows.length} onClick={exportCsv}><Download className="size-4" />CSV</Button>
        <Button size="sm" variant="outline" className="h-9" onClick={() => setMode(mode === "import" ? null : "import")}><FileUp className="size-4" />Import</Button>
        <Button size="sm" className="h-9" onClick={() => setMode(mode === "add" ? null : "add")}><Plus className="size-4" />Add item</Button>
      </div>

      {mode === "add" && <AddItem reload={reload} close={() => setMode(null)} />}
      {mode === "import" && <ImportItems reload={reload} close={() => setMode(null)} />}

      {rows.length > 0 && total > 0 && <p className="text-sm text-muted-foreground">{rows.length} item{rows.length === 1 ? "" : "s"} · replacement value {money(total)}</p>}
      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        <div className="space-y-2">
          {rows.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{data.items.length ? "Nothing in this list." : "Your register is empty. Add items one by one or import a spreadsheet."}</p>}
          {rows.map((i) => (
            <button key={i.id} type="button" onClick={() => setSelected(i.id)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${selected === i.id ? "border-primary bg-primary/5" : "bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{i.name}</span>
                <Pill tone={ITEM_TONE[i.status] ?? "bg-muted"}>{ITEM_STATUS[i.status as keyof typeof ITEM_STATUS] ?? i.status}</Pill>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[i.assetTag, label(CATEGORIES, i.category), label(CONDITIONS, i.condition), i.value != null ? money(i.value) : null, holders.get(i.id) ? `with ${holders.get(i.id)}` : i.location].filter(Boolean).join(" · ")}
              </p>
            </button>
          ))}
        </div>
        {selected && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <ItemDetail key={selected + data.items.find((i) => i.id === selected)?.status} id={selected} data={data} reload={reload} go={go} onClose={() => setSelected(null)} onDeleted={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

function AddItem({ reload, close }: { reload: () => Promise<unknown>; close: () => void }) {
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const r = await jsonFetch<{ items: { name: string; assetTag: string }[] }>("/api/modules/equipment/items", {
        method: "POST",
        body: JSON.stringify({ items: [{ ...draftBody(draft), photo: draft.photos[0] ?? null }] }),
      });
      setAdded(`${r.items[0].name} added as ${r.items[0].assetTag}`);
      setDraft({ ...emptyDraft, category: draft.category, location: draft.location });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">Add equipment</h3>
      <ItemForm draft={draft} set={setDraft} />
      {added && <p className="text-sm text-green-700 dark:text-green-300">{added}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || draft.name.trim().length < 2} onClick={save}>{busy ? "Saving…" : "Add to register"}</Button>
        <Button size="sm" variant="ghost" onClick={close}>Done</Button>
      </div>
    </div>
  );
}

function ImportItems({ reload, close }: { reload: () => Promise<unknown>; close: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<{ name: string; rows: string[][] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const source = sheet?.rows ?? (text.trim() ? textToRows(text) : null);
  const parsed: { items: ImportItem[]; errors: string[] } | null = source ? parseItemRows(source) : null;

  async function pick(f: File | undefined) {
    if (!f) return;
    setError(null);
    try {
      const rows = /\.(csv|txt)$/i.test(f.name) ? textToRows(await f.text()) : await readXlsx(f);
      setSheet({ name: f.name, rows });
    } catch {
      setError("Could not read that file. Save it as .xlsx or .csv and try again.");
    }
  }

  async function run() {
    if (!parsed?.items.length) return;
    setBusy(true);
    setError(null);
    try {
      const r = await jsonFetch<{ items: unknown[] }>("/api/modules/equipment/items", { method: "POST", body: JSON.stringify({ items: parsed.items }) });
      setDone(r.items.length);
      setSheet(null);
      setText("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">Import from Excel or CSV</h3>
      <p className="text-sm text-muted-foreground">
        First row = headings. Recognised columns: <strong>Item</strong> (required), Asset tag, Serial number, Category, Value, Condition, Location. Blank asset tags get the next EQ number.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => file.current?.click()}><FileUp className="size-4" />Choose file</Button>
        {sheet && <span className="text-sm">{sheet.name} <button type="button" className="text-muted-foreground underline" onClick={() => setSheet(null)}>clear</button></span>}
        <input ref={file} type="file" hidden accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {!sheet && <textarea className={`${textareaClass} font-mono text-xs`} rows={5} placeholder={"…or paste cells here\nItem\tAsset tag\tSerial number\tValue\nMakita drill\tT-014\tMK88231\t2450"} value={text} onChange={(e) => setText(e.target.value)} />}
      {parsed && (
        <div className="space-y-2 text-sm">
          <p><strong>{parsed.items.length}</strong> item{parsed.items.length === 1 ? "" : "s"} ready{parsed.items.length > 500 ? " (max 500 per import)" : ""}.</p>
          {parsed.errors.map((e) => <p key={e} className="text-xs text-amber-700 dark:text-amber-300">{e}</p>)}
          {parsed.items.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left"><tr>{["Item", "Tag", "Serial", "Category", "Value", "Condition"].map((h) => <th key={h} className="px-2 py-1 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {parsed.items.slice(0, 50).map((it, n) => (
                    <tr key={n} className="border-t">
                      <td className="px-2 py-1">{it.name}</td><td className="px-2 py-1">{it.assetTag ?? "auto"}</td><td className="px-2 py-1">{it.serialNumber}</td>
                      <td className="px-2 py-1">{label(CATEGORIES, it.category)}</td><td className="px-2 py-1">{money(it.value)}</td><td className="px-2 py-1">{label(CONDITIONS, it.condition)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {done !== null && <p className="text-sm text-green-700 dark:text-green-300">{done} item{done === 1 ? "" : "s"} imported.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !parsed?.items.length || parsed.items.length > 500} onClick={run}>{busy ? "Importing…" : "Import"}</Button>
        <Button size="sm" variant="ghost" onClick={close}>Close</Button>
      </div>
    </div>
  );
}
