"use client";

import { useRef, useState } from "react";
import { Archive, BookOpen, Eye, FilePlus2, Pencil, Send, Trash2, Upload } from "lucide-react";
import { Button, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { Pill, selectClass, textareaClass, type ContractData, type Template } from "@/components/modules/contract/types";
import { CATEGORIES, CONTRACT_LIBRARY, STANDARD_FIELDS } from "@/lib/modules/contract-library";

type Mode = { kind: "none" } | { kind: "library" } | { kind: "new" } | { kind: "upload" } | { kind: "edit"; t: Template };
const catLabel = (c: string) => CATEGORIES.find((x) => x.key === c)?.label ?? c;

export function TemplatesTab({ data, setData, sendWith }: { data: ContractData; setData: (d: ContractData) => void; sendWith: (id: string) => void }) {
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const list = data.templates.filter((t) => showArchived || !t.archived);
  const upsert = (t: Template) =>
    setData({ ...data, templates: data.templates.some((x) => x.id === t.id) ? data.templates.map((x) => (x.id === t.id ? { ...t, counts: x.counts } : x)) : [...data.templates, t] });

  async function addLibrary(slug: string) {
    setBusy(slug);
    setError(null);
    try {
      const r = await jsonFetch<{ template: Template }>("/api/modules/contract/templates", { method: "POST", body: JSON.stringify({ librarySlug: slug }) });
      upsert(r.template);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
    } finally {
      setBusy(null);
    }
  }

  async function archive(t: Template, archived: boolean) {
    setBusy(t.id);
    try {
      upsert((await jsonFetch<{ template: Template }>(`/api/modules/contract/templates/${t.id}`, { method: "PATCH", body: JSON.stringify({ archived }) })).template);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(null);
    }
  }

  async function remove(t: Template) {
    if (!confirm(`Delete the template "${t.name}"?${t.counts.sent ? " It has been sent before, so it will be archived instead." : ""}`)) return;
    setBusy(t.id);
    try {
      const r = await jsonFetch<{ archived?: boolean; template?: Template }>(`/api/modules/contract/templates/${t.id}`, { method: "DELETE" });
      if (r.archived && r.template) upsert(r.template);
      else setData({ ...data, templates: data.templates.filter((x) => x.id !== t.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {data.canManage && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={mode.kind === "library" ? "default" : "outline"} onClick={() => setMode(mode.kind === "library" ? { kind: "none" } : { kind: "library" })}><BookOpen className="size-4" />Template library</Button>
          <Button size="sm" variant={mode.kind === "new" ? "default" : "outline"} onClick={() => setMode(mode.kind === "new" ? { kind: "none" } : { kind: "new" })}><FilePlus2 className="size-4" />Write a template</Button>
          <Button size="sm" variant={mode.kind === "upload" ? "default" : "outline"} onClick={() => setMode(mode.kind === "upload" ? { kind: "none" } : { kind: "upload" })}><Upload className="size-4" />Upload a PDF</Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {mode.kind === "library" && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Ready-made South African templates</h3>
          <p className="mb-3 text-sm text-muted-foreground">Add one, then edit the wording to suit your company. Have your contracts checked by a labour law adviser.</p>
          <ul className="divide-y">
            {CONTRACT_LIBRARY.map((l) => {
              const have = data.templates.some((t) => t.name === l.name && !t.archived);
              return (
                <li key={l.slug} className="flex items-center gap-2 py-2 text-sm">
                  <span className="mr-auto">{l.name} <span className="text-xs text-muted-foreground">· {catLabel(l.category)}</span></span>
                  <Button size="sm" variant="outline" disabled={have || busy === l.slug} onClick={() => addLibrary(l.slug)}>{have ? "Added" : busy === l.slug ? "Adding…" : "Add"}</Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {mode.kind === "new" && <TextTemplateForm onSaved={(t) => { upsert(t); setMode({ kind: "none" }); }} onCancel={() => setMode({ kind: "none" })} />}
      {mode.kind === "edit" && <TextTemplateForm initial={mode.t} onSaved={(t) => { upsert(t); setMode({ kind: "none" }); }} onCancel={() => setMode({ kind: "none" })} />}
      {mode.kind === "upload" && <UploadForm onSaved={(t) => { upsert(t); setMode({ kind: "none" }); }} onCancel={() => setMode({ kind: "none" })} />}

      <div className="space-y-2">
        {list.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No templates yet. Start from the template library, write your own, or upload a PDF contract.</p>
        )}
        {list.map((t) => (
          <div key={t.id} className={`rounded-lg border bg-card p-3 text-sm ${t.archived ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {catLabel(t.category)} · {t.kind === "pdf" ? `PDF, ${t.pageCount} page${t.pageCount === 1 ? "" : "s"}` : "Text"}
                  {t.requireCountersign ? " · countersigned" : ""}{t.dueDays ? ` · ${t.dueDays} days to sign` : ""}{t.archived ? " · archived" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Pill tone="bg-muted">{t.counts.sent} sent</Pill>
                <Pill tone="bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200">{t.counts.completed} signed</Pill>
                {t.counts.open > 0 && <Pill tone="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">{t.counts.open} waiting</Pill>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {!t.archived && <Button size="sm" onClick={() => sendWith(t.id)}><Send className="size-4" />Send</Button>}
              <Button size="sm" variant="outline" asChild>
                <a href={t.kind === "pdf" ? `/api/modules/contract/templates/${t.id}` : `/api/modules/contract/templates/${t.id}/preview`} target="_blank" rel="noreferrer"><Eye className="size-4" />Preview</a>
              </Button>
              {data.canManage && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setMode({ kind: "edit", t })}><Pencil className="size-4" />Edit</Button>
                  <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => archive(t, !t.archived)}><Archive className="size-4" />{t.archived ? "Restore" : "Archive"}</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === t.id} onClick={() => remove(t)}><Trash2 className="size-4" />Delete</Button>
                </>
              )}
            </div>
          </div>
        ))}
        {data.templates.some((t) => t.archived) && (
          <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setShowArchived((v) => !v)}>{showArchived ? "Hide archived" : "Show archived templates"}</button>
        )}
      </div>
    </div>
  );
}

function TextTemplateForm({ initial, onSaved, onCancel }: { initial?: Template; onSaved: (t: Template) => void; onCancel: () => void }) {
  const isPdf = initial?.kind === "pdf";
  const [v, setV] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "contract",
    bodyText: initial?.bodyText ?? "",
    requireCountersign: initial?.requireCountersign ?? false,
    dueDays: initial?.dueDays ? String(initial.dueDays) : "7",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  function insert(key: string) {
    const el = area.current;
    const token = `{{${key}}}`;
    if (!el) return setV({ ...v, bodyText: v.bodyText + token });
    const start = el.selectionStart ?? v.bodyText.length;
    const next = v.bodyText.slice(0, start) + token + v.bodyText.slice(el.selectionEnd ?? start);
    setV({ ...v, bodyText: next });
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + token.length; });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { name: v.name, category: v.category, requireCountersign: v.requireCountersign, dueDays: v.dueDays ? Number(v.dueDays) : null, ...(isPdf ? {} : { bodyText: v.bodyText }) };
    try {
      const r = initial
        ? await jsonFetch<{ template: Template }>(`/api/modules/contract/templates/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await jsonFetch<{ template: Template }>("/api/modules/contract/templates", { method: "POST", body: JSON.stringify(body) });
      onSaved(r.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">{initial ? `Edit ${initial.name}` : "New template"}</h3>
      <Settings v={v} set={(p) => setV({ ...v, ...p })} />
      {!isPdf && (
        <div className="space-y-1.5">
          <Label htmlFor="tp-body">Text</Label>
          <div className="flex flex-wrap gap-1">
            {STANDARD_FIELDS.map((f) => (
              <button key={f.key} type="button" className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted" onClick={() => insert(f.key)}>+ {f.label}</button>
            ))}
          </div>
          <textarea id="tp-body" ref={area} required minLength={20} className={`${textareaClass} min-h-72 font-mono text-xs`} value={v.bodyText} onChange={(e) => setV({ ...v, bodyText: e.target.value })}
            placeholder={"# 1. Heading\nParagraph text. Use {{salary}} for a blank you fill in when sending.\n- Bullet point"} />
          <p className="text-xs text-muted-foreground">Start a line with # for a heading and - for a bullet. Any other {"{{word}}"} becomes a blank you fill in when you send it.</p>
        </div>
      )}
      {initial && <p className="text-xs text-muted-foreground">Changes apply to documents you send from now on. Documents already sent keep their original wording.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save template"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function UploadForm({ onSaved, onCancel }: { onSaved: (t: Template) => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: "", category: "contract", requireCountersign: true, dueDays: "7" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a PDF file.");
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("name", v.name);
    form.set("category", v.category);
    form.set("requireCountersign", String(v.requireCountersign));
    form.set("dueDays", v.dueDays);
    const res = await fetch("/api/modules/contract/templates/upload", { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "Upload failed");
      setBusy(false);
      return;
    }
    onSaved(d.template);
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">Upload your own contract (PDF)</h3>
      <p className="text-sm text-muted-foreground">The employee reads your PDF on their phone and signs once. Their signature is stamped on the bottom of every page and a signature and certificate page is added at the end.</p>
      <div className="space-y-1.5">
        <Label htmlFor="up-f">PDF file</Label>
        <Input id="up-f" type="file" accept="application/pdf,.pdf" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !v.name) setV({ ...v, name: f.name.replace(/\.pdf$/i, "") }); }} />
      </div>
      <Settings v={v} set={(p) => setV({ ...v, ...p })} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

type SettingsValue = { name: string; category: string; requireCountersign: boolean; dueDays: string };
function Settings({ v, set }: { v: SettingsValue; set: (p: Partial<SettingsValue>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <div className="space-y-1.5"><Label htmlFor="tp-n">Name</Label><Input id="tp-n" required minLength={2} value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label htmlFor="tp-c">Type</Label>
        <select id="tp-c" className={selectClass} value={v.category} onChange={(e) => set({ category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="tp-d">Days to sign</Label><Input id="tp-d" type="number" min={1} max={90} value={v.dueDays} onChange={(e) => set({ dueDays: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" className="size-4" checked={v.requireCountersign} onChange={(e) => set({ requireCountersign: e.target.checked })} />
        Company countersigns after the employee (contracts)
      </label>
    </div>
  );
}
