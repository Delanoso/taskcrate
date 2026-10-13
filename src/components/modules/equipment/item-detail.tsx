"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, Download, Pencil, Trash2 } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { PhotoList } from "@/components/modules/photo-list";
import { CATEGORIES, CONDITIONS, ISSUE_STATUS, ITEM_STATUS, label, money } from "@/lib/modules/equipment-options";
import { Panel, Section } from "@/components/modules/equipment/issue-detail";
import { ISSUE_TONE, ITEM_TONE, Pill, fmtDate, parseMoney, selectClass, textareaClass, type EquipData, type Go, type IssueRow, type ItemRow, type LogRow } from "@/components/modules/equipment/types";

type Detail = { item: ItemRow; issues: IssueRow[]; logs: LogRow[] };

export type ItemDraft = { name: string; assetTag: string; category: string; serialNumber: string; value: string; condition: string; location: string; notes: string; photos: string[] };
export const emptyDraft: ItemDraft = { name: "", assetTag: "", category: "other", serialNumber: "", value: "", condition: "good", location: "", notes: "", photos: [] };
export const draftBody = (d: ItemDraft) => ({
  name: d.name,
  assetTag: d.assetTag || null,
  category: d.category,
  serialNumber: d.serialNumber || null,
  value: d.value ? parseMoney(d.value) : null,
  condition: d.condition,
  location: d.location || null,
  notes: d.notes || null,
});

export function ItemForm({ draft, set, tagHint }: { draft: ItemDraft; set: (d: ItemDraft) => void; tagHint?: string }) {
  const f = (k: keyof ItemDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set({ ...draft, [k]: e.target.value });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="it-name">Item</Label><Input id="it-name" value={draft.name} onChange={f("name")} placeholder="Dell Latitude 5440 laptop" /></div>
      <div className="space-y-1.5"><Label htmlFor="it-tag">Asset tag</Label><Input id="it-tag" value={draft.assetTag} onChange={f("assetTag")} placeholder={tagHint ?? "Blank = next EQ number"} /></div>
      <div className="space-y-1.5"><Label htmlFor="it-sn">Serial number</Label><Input id="it-sn" value={draft.serialNumber} onChange={f("serialNumber")} /></div>
      <div className="space-y-1.5">
        <Label htmlFor="it-cat">Category</Label>
        <select id="it-cat" className={selectClass} value={draft.category} onChange={f("category")}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="it-cond">Condition</Label>
        <select id="it-cond" className={selectClass} value={draft.condition} onChange={f("condition")}>{CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="it-val">Replacement value (R)</Label><Input id="it-val" inputMode="decimal" value={draft.value} onChange={f("value")} placeholder="0.00" /></div>
      <div className="space-y-1.5"><Label htmlFor="it-loc">Store / location</Label><Input id="it-loc" value={draft.location} onChange={f("location")} placeholder="Main store" /></div>
      <textarea className={`${textareaClass} sm:col-span-2`} maxLength={1000} placeholder="Notes" value={draft.notes} onChange={f("notes")} />
      <div className="sm:col-span-2"><PhotoList value={draft.photos} onChange={(p) => set({ ...draft, photos: p })} max={1} label="Photo" /></div>
    </div>
  );
}

const EVENT: Record<string, string> = {
  added: "Added to register",
  edited: "Details edited",
  issue: "Issued to",
  signed: "Signed for by",
  handback: "Checked in from",
  lost: "Lost / not returned by",
  cancelled: "Issue cancelled for",
  repair_done: "Back from repair",
  repair_failed: "Written off after repair",
  status_available: "Put back in store",
  status_repair: "Sent for repair",
  status_lost: "Marked lost",
  status_retired: "Written off",
  note: "Note",
};

export function ItemDetail({ id, data, reload, go, onClose, onDeleted }: { id: string; data: EquipData; reload: () => Promise<unknown>; go: Go; onClose: () => void; onDeleted: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ItemDraft | null>(null);

  useEffect(() => {
    jsonFetch<Detail>(`/api/modules/equipment/items/${id}`).then(setD).catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, [id]);

  if (!d) return <Panel onClose={onClose}>{error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-sm text-muted-foreground">Loading…</p>}</Panel>;
  const i = d.item;
  const holder = d.issues.find((x) => x.status === "active" || x.status === "awaiting_signature");

  async function patch(body: object) {
    setBusy(true);
    setError(null);
    try {
      setD(await jsonFetch<Detail>(`/api/modules/equipment/items/${i.id}`, { method: "PATCH", body: JSON.stringify(body) }));
      setEditing(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${i.name}?`)) return;
    setBusy(true);
    try {
      await jsonFetch(`/api/modules/equipment/items/${i.id}`, { method: "DELETE" });
      await reload();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Panel onClose={() => setEditing(null)}>
        <h3 className="mb-3 font-semibold">Edit {i.name}</h3>
        <ItemForm draft={editing} set={setEditing} tagHint={i.assetTag ?? undefined} />
        {i.photoUrl && !editing.photos.length && <p className="mt-2 text-xs text-muted-foreground">Current photo is kept unless you add a new one.</p>}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={busy || editing.name.trim().length < 2} onClick={() => patch({ action: "update", ...draftBody(editing), photo: editing.photos[0] ?? null })}>{busy ? "Saving…" : "Save"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      </Panel>
    );
  }

  const setStatus = (status: string, prompt?: string) => {
    const note = prompt ? window.prompt(prompt) : "";
    if (note === null) return;
    patch({ action: "set_status", status, note: note || undefined });
  };

  return (
    <Panel onClose={onClose}>
      <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
        <div className="flex gap-3">
          {i.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.photoUrl} alt={i.name} className="size-16 rounded-md border object-cover" />
          )}
          <div>
            <p className="text-xs text-muted-foreground">{i.assetTag}{i.serialNumber ? ` · S/N ${i.serialNumber}` : ""}</p>
            <h3 className="text-lg font-semibold">{i.name}</h3>
            <p className="text-sm text-muted-foreground">{label(CATEGORIES, i.category)} · {label(CONDITIONS, i.condition)}{i.value != null ? ` · ${money(i.value)}` : ""}{i.location ? ` · ${i.location}` : ""}</p>
          </div>
        </div>
        <Pill tone={ITEM_TONE[i.status] ?? "bg-muted"}>{ITEM_STATUS[i.status as keyof typeof ITEM_STATUS] ?? i.status}</Pill>
      </div>
      {i.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{i.notes}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {holder ? (
        <Section title="Signed out">
          <p className="text-sm">{holder.employeeName} since {fmtDate(holder.issuedAt)} ({holder.documentNumber}){holder.dueBackAt ? `, due ${fmtDate(holder.dueBackAt)}` : ""}</p>
          <Button size="sm" onClick={() => go.checkIn(holder.employeeName)}><ArrowDownToLine className="size-4" />Check in</Button>
        </Section>
      ) : (
        <Section title="Status">
          <div className="flex flex-wrap gap-2">
            {i.status === "available" && data.modules.issuer && <Button size="sm" onClick={() => go.issue(null)}>Issue</Button>}
            {i.status === "available" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("repair", "What needs fixing? (optional)")}>Send for repair</Button>}
            {i.status !== "available" && i.status !== "issued" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("available", "Note (optional)")}>Back in store</Button>}
            {data.canManage && i.status !== "lost" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("lost", "What happened? (SAPS case number for theft)")}>Mark lost</Button>}
            {data.canManage && i.status !== "retired" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("retired", "Why is it being written off?")}>Write off</Button>}
          </div>
        </Section>
      )}

      <Section title={`Custody history (${d.issues.length})`}>
        {d.issues.length === 0 && <p className="text-sm text-muted-foreground">Never issued.</p>}
        <ul className="space-y-1.5 text-sm">
          {d.issues.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2">
              <span>
                {x.employeeName} <span className="text-muted-foreground">· {fmtDate(x.issuedAt)}{x.returnedAt ? ` → ${fmtDate(x.returnedAt)}` : ""}{x.conditionIn ? ` · ${label(CONDITIONS, x.conditionIn).toLowerCase()}` : ""}</span>
              </span>
              <span className="flex items-center gap-1">
                <a className="text-xs text-primary hover:underline" href={`/api/modules/equipment/issues/${x.id}/pdf`} target="_blank" rel="noreferrer">{x.documentNumber}</a>
                {x.handbackNumber && <a className="text-xs text-primary hover:underline" href={`/api/modules/equipment/issues/${x.id}/pdf?type=handback`} target="_blank" rel="noreferrer">{x.handbackNumber}</a>}
                <Pill tone={ISSUE_TONE[x.status] ?? "bg-muted"}>{ISSUE_STATUS[x.status as keyof typeof ISSUE_STATUS] ?? x.status}</Pill>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Activity">
        <ol className="max-h-56 space-y-1 overflow-y-auto text-sm">
          {d.logs.map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="w-36 shrink-0 text-muted-foreground">{fmtDate(l.at, true)}</span>
              <span>{EVENT[l.action] ?? l.action}{l.employeeName ? ` ${l.employeeName}` : ""}{l.note ? ` - ${l.note}` : ""}{l.by && l.action !== "signed" ? <span className="text-muted-foreground"> ({l.by})</span> : null}</span>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button size="sm" variant="outline" asChild><a href={`/api/modules/equipment/items/${i.id}/pdf`} target="_blank" rel="noreferrer"><Download className="size-4" />Asset card</a></Button>
        <Button size="sm" variant="outline" onClick={() => setEditing({ name: i.name, assetTag: i.assetTag ?? "", category: i.category, serialNumber: i.serialNumber ?? "", value: i.value != null ? String(i.value) : "", condition: i.condition, location: i.location ?? "", notes: i.notes ?? "", photos: [] })}>
          <Pencil className="size-4" />Edit
        </Button>
        {data.canManage && d.issues.every((x) => x.status === "cancelled") && <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={remove}><Trash2 className="size-4" />Delete</Button>}
      </div>
    </Panel>
  );
}
