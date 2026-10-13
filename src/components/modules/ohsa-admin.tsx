"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { Button, Input, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, jsonFetch } from "@/components/modules/ui-bits";
import { AuditRunner } from "@/components/modules/ohsa-audit-runner";
import { AUDIT_QUESTIONS, AUDIT_SECTIONS } from "@/lib/modules/ohsa-audit-items";

type AuditListItem = {
  id: string;
  title: string;
  monthLabel: string;
  auditorName: string | null;
  status: string;
  score: number | null;
  legacy: boolean;
  createdAt: string;
  summary: { yes: number; no: number; na: number; answered: number; total: number; compliance: number | null };
};

const currentMonth = () => new Date().toLocaleDateString("en-ZA", { month: "short", year: "numeric" });

export function OhsaAdmin() {
  const [items, setItems] = useState<AuditListItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", monthLabel: currentMonth(), auditorName: "" });
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchItems = () => jsonFetch<{ items: AuditListItem[] }>("/api/modules/ohsa").then((d) => d.items);
  const load = () => fetchItems().then(setItems);
  useEffect(() => {
    if (openId) return;
    fetchItems().then(setItems).catch(console.error);
  }, [openId]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await jsonFetch("/api/modules/ohsa", { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, title: "" });
      setOpenId(data.audit.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start audit");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await jsonFetch(`/api/modules/ohsa/${id}`, { method: "DELETE" });
      setConfirm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  if (openId) return <AuditRunner auditId={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Start a health & safety audit</CardTitle>
          <CardDescription>
            {AUDIT_QUESTIONS.length} questions in {AUDIT_SECTIONS.length} sections. Answer Yes, No or N/A, add photos and
            notes — every answer saves as you go, so you can stop and continue later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={start} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Site / area</Label>
              <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Main warehouse" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="monthLabel">Audit period</Label>
                <Input id="monthLabel" required value={form.monthLabel} onChange={(e) => setForm({ ...form, monthLabel: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auditorName">Auditor</Label>
                <Input id="auditorName" value={form.auditorName} onChange={(e) => setForm({ ...form, auditorName: e.target.value })} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Starting…" : "Start audit"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardHeader><CardTitle>Audits</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No audits yet.</p>}
          {items.map((a) => (
            <div key={a.id} className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.monthLabel}
                    {a.auditorName ? ` · ${a.auditorName}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {a.status === "completed" ? "Completed" : "In progress"}
                </span>
              </div>
              {a.legacy ? (
                <p className="text-xs text-muted-foreground">Old 8-point checklist · score {a.score ?? "–"}%</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {a.summary.answered}/{a.summary.total} answered · <span className="text-red-700">{a.summary.no} findings</span> ·
                  compliance <span className="font-semibold text-foreground">{a.summary.compliance === null ? "–" : `${a.summary.compliance}%`}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {!a.legacy && (
                  <Button size="sm" variant={a.status === "completed" ? "outline" : "default"} onClick={() => setOpenId(a.id)}>
                    {a.status === "completed" ? "View" : "Continue"}
                  </Button>
                )}
                {!a.legacy && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/modules/ohsa/${a.id}/pdf`} target="_blank" rel="noreferrer">
                      <FileDown className="size-4" /> PDF
                    </a>
                  </Button>
                )}
                {confirm === a.id ? (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => remove(a.id)}>Yes, delete</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirm(a.id)}>Delete</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
