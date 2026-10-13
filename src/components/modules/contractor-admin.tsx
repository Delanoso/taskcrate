"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { Button, Input, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, LinkBox, jsonFetch } from "@/components/modules/ui-bits";
import { RequirementPicker } from "@/components/modules/safety-file/requirement-picker";
import {
  FileStatusBadge,
  ItemStateBadge,
  Progress,
  fmtBytes,
  fmtDate,
  type SafetyDoc,
  type SafetyItem,
} from "@/components/modules/safety-file/shared";
import { SAFETY_FILE_PRESETS } from "@/lib/modules/safety-file-items";

type Contractor = {
  id: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  publicToken: string;
  status: string;
  done: number;
  total: number;
  requirements: string[];
  items: SafetyItem[];
  documents: SafetyDoc[];
};

const EMPTY_FORM = { companyName: "", contactName: "", contactEmail: "", contactPhone: "" };
const DEFAULT_REQUIREMENTS = SAFETY_FILE_PRESETS.find((p) => p.id === "standard")!.keys;

export function ContractorAdmin() {
  const [items, setItems] = useState<Contractor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [requirements, setRequirements] = useState<string[]>(DEFAULT_REQUIREMENTS);
  const [editing, setEditing] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    const data = await jsonFetch<{ items: Contractor[] }>("/api/modules/contractor");
    setItems(data.items);
    return data.items;
  }
  useEffect(() => {
    load()
      .then((list) => setSelectedId((id) => id ?? list[0]?.id ?? null))
      .catch(console.error);
  }, []);

  const selected = creating ? undefined : items.find((c) => c.id === selectedId);
  const otherDocs = selected ? selected.documents.filter((d) => !selected.requirements.includes(d.docType)) : [];

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const data = await jsonFetch("/api/modules/contractor", {
        method: "POST",
        body: JSON.stringify({ ...form, requirements }),
      });
      setForm(EMPTY_FORM);
      setRequirements(DEFAULT_REQUIREMENTS);
      setCreating(false);
      await load();
      setSelectedId(data.item.id);
    });
  }

  function saveRequirements() {
    if (!selected || !editing) return;
    run(async () => {
      await jsonFetch("/api/modules/contractor", {
        method: "PATCH",
        body: JSON.stringify({ id: selected.id, requirements: editing }),
      });
      setEditing(null);
      await load();
    });
  }

  function deleteDoc(id: string) {
    run(async () => {
      await jsonFetch(`/api/modules/contractor/documents/${id}`, { method: "DELETE" });
      setConfirm(null);
      await load();
    });
  }

  function deleteContractor(id: string) {
    run(async () => {
      await jsonFetch(`/api/modules/contractor?id=${id}`, { method: "DELETE" });
      setConfirm(null);
      const list = await load();
      setSelectedId(list[0]?.id ?? null);
    });
  }

  function select(id: string) {
    setCreating(false);
    setEditing(null);
    setConfirm(null);
    setError(null);
    setSelectedId(id);
  }

  function whatsapp(c: Contractor) {
    const text = [
      `Hi${c.contactName ? ` ${c.contactName}` : ""},`,
      "",
      `Please upload ${c.companyName}'s safety file documents using this secure link:`,
      `${appUrl}/p/contractor/${c.publicToken}`,
    ].join("\n");
    const phone = c.contactPhone?.replace(/\D/g, "") ?? "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Card className="self-start">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Contractors</CardTitle>
            <CardDescription>Safety files and their status.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setCreating(true); setError(null); }}>
            <Plus className="size-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No contractors yet.</p>}
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className={`w-full space-y-1.5 rounded-md border p-3 text-left text-sm transition-colors ${
                !creating && c.id === selectedId ? "border-primary bg-primary/5" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{c.companyName}</span>
                <FileStatusBadge status={c.status} />
              </div>
              <Progress done={c.done} total={c.total} />
            </button>
          ))}
        </CardContent>
      </Card>

      {creating && (
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Add contractor</CardTitle>
            <CardDescription>Choose what this contractor must submit. You can change it later.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactName">Contact person</Label>
                  <Input id="contactName" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">WhatsApp number</Label>
                  <Input id="contactPhone" type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Documents required</Label>
                <RequirementPicker value={requirements} onChange={setRequirements} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={busy || requirements.length === 0}>
                  {busy ? "Creating…" : "Create & get upload link"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selected && (
        <Card className="self-start">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate">{selected.companyName}</CardTitle>
                <CardDescription>
                  {[selected.contactName, selected.contactPhone, selected.contactEmail].filter(Boolean).join(" · ") || "No contact details"}
                </CardDescription>
              </div>
              <FileStatusBadge status={selected.status} />
            </div>
            <Progress done={selected.done} total={selected.total} />
          </CardHeader>
          <CardContent className="space-y-4">
            <LinkBox url={`${appUrl}/p/contractor/${selected.publicToken}`} />
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <a href={whatsapp(selected)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              </Button>
              {selected.documents.length > 0 && (
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/modules/contractor/${selected.id}/zip`}>
                    <Download className="size-4" /> Download all (ZIP)
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(editing ? null : selected.requirements)}>
                {editing ? "Cancel editing" : "Edit required documents"}
              </Button>
              {confirm === `c:${selected.id}` ? (
                <>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => deleteContractor(selected.id)}>
                    Yes, delete contractor & files
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm(`c:${selected.id}`)}>
                  Delete
                </Button>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {editing ? (
              <div className="space-y-3">
                <RequirementPicker value={editing} onChange={setEditing} />
                <Button size="sm" disabled={busy || editing.length === 0} onClick={saveRequirements}>
                  {busy ? "Saving…" : "Save required documents"}
                </Button>
              </div>
            ) : (
              <ul className="divide-y rounded-md border">
                {selected.items.map((item) => {
                  const docs = selected.documents.filter((d) => d.docType === item.key);
                  return (
                    <li key={item.key} className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        <ItemStateBadge state={item.state} />
                      </div>
                      {docs.map(docRow)}
                    </li>
                  );
                })}
                {otherDocs.length > 0 && (
                  <li className="space-y-2 p-3">
                    <span className="text-sm font-medium">Other uploads (no longer on the required list)</span>
                    {otherDocs.map(docRow)}
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  function docRow(d: SafetyDoc) {
    return (
      <div key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{d.fileName ?? "Document"}</span>
        <span className="text-xs text-muted-foreground">
          {[fmtBytes(d.sizeBytes), `uploaded ${fmtDate(d.uploadedAt)}`, d.expiresAt && `expires ${fmtDate(d.expiresAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className="flex items-center gap-1">
          <a href={`/api/modules/contractor/documents/${d.id}`} target="_blank" rel="noreferrer" title="View" className="rounded p-1 hover:bg-background">
            <Eye className="size-4" />
          </a>
          <a href={`/api/modules/contractor/documents/${d.id}?download=1`} title="Download" className="rounded p-1 hover:bg-background">
            <Download className="size-4" />
          </a>
          {confirm === d.id ? (
            <>
              <button type="button" disabled={busy} onClick={() => deleteDoc(d.id)} className="rounded px-1.5 text-xs font-medium text-destructive hover:bg-background">
                Delete
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="rounded px-1.5 text-xs hover:bg-background">
                Keep
              </button>
            </>
          ) : (
            <button type="button" title="Delete" onClick={() => setConfirm(d.id)} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          )}
        </span>
      </div>
    );
  }
}
