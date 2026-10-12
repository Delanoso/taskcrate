"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, jsonFetch } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export function OhsaAdmin() {
  const [checklist, setChecklist] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("Monthly statutory walkthrough");
  const [monthLabel, setMonthLabel] = useState("");
  const [answers, setAnswers] = useState<Record<string, { pass: boolean; notes?: string; photoUrl?: string }>>({});

  useEffect(() => {
    jsonFetch("/api/modules/ohsa").then((d) => {
      setChecklist(d.checklist);
      setItems(d.items);
      const init: typeof answers = {};
      for (const c of d.checklist) init[c.id] = { pass: false };
      setAnswers(init);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      monthLabel,
      answers: checklist.map((c) => ({ id: c.id, ...answers[c.id] })),
    };
    const data = await jsonFetch("/api/modules/ohsa", { method: "POST", body: JSON.stringify(payload) });
    if (data.pdfBytesBase64) {
      const a = document.createElement("a");
      a.href = `data:application/pdf;base64,${data.pdfBytesBase64}`;
      a.download = `${data.pdf.documentNumber}.pdf`;
      a.click();
    }
    const refreshed = await jsonFetch("/api/modules/ohsa");
    setItems(refreshed.items);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Run mock audit</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Month</Label><Input value={monthLabel} onChange={(e) => setMonthLabel(e.target.value)} required placeholder="Oct 2026" /></div>
            {checklist.map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!answers[c.id]?.pass} onChange={(e) => setAnswers({ ...answers, [c.id]: { ...answers[c.id], pass: e.target.checked } })} />
                  {c.label} <span className="text-xs text-muted-foreground">({c.weight})</span>
                </label>
                <PhotoInput label="Evidence photo" onChange={(url) => setAnswers({ ...answers, [c.id]: { ...answers[c.id], photoUrl: url ?? undefined } })} />
              </div>
            ))}
            <Button type="submit">Score & download PDF</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Past audits</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between border-b py-2">
              <span>{i.title} · {i.monthLabel}</span>
              <span className="font-medium">{i.score}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
