"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import type { DisciplineData, DisciplineSettingsValue } from "@/components/modules/discipline/types";

export function SettingsTab({ data, setData }: { data: DisciplineData; setData: (d: DisciplineData) => void }) {
  const [v, setV] = useState({
    verbalMonths: String(data.settings.verbalMonths),
    writtenMonths: String(data.settings.writtenMonths),
    finalMonths: String(data.settings.finalMonths),
    defaultIssuer: data.settings.defaultIssuer ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const d = await jsonFetch<{ settings: DisciplineSettingsValue }>("/api/modules/discipline", {
        method: "PUT",
        body: JSON.stringify({
          verbalMonths: Number(v.verbalMonths),
          writtenMonths: Number(v.writtenMonths),
          finalMonths: Number(v.finalMonths),
          defaultIssuer: v.defaultIssuer.trim() || null,
        }),
      });
      setData({ ...data, settings: d.settings });
      setMsg({ ok: true, text: "Saved. New warnings use these periods; existing warnings keep their dates." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: "verbalMonths" | "writtenMonths" | "finalMonths", label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={key} type="number" min={1} max={36} className="w-24" disabled={!data.canManage} value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
        <span className="text-sm text-muted-foreground">months</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Warning validity</CardTitle>
          <CardDescription>How long a warning stays active and counts towards the next step. Common South African practice is 3, 6 and 12 months — check your disciplinary code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {field("verbalMonths", "Verbal warning")}
            {field("writtenMonths", "Written warning")}
            {field("finalMonths", "Final written warning")}
          </div>
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="issuer">Default &ldquo;issued by&rdquo; name</Label>
            <Input id="issuer" maxLength={120} disabled={!data.canManage} placeholder={data.me} value={v.defaultIssuer} onChange={(e) => setV({ ...v, defaultIssuer: e.target.value })} />
          </div>
          {data.canManage ? <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save settings"}</Button> : <p className="text-sm text-muted-foreground">Only managers can change these settings.</p>}
          {msg && <p className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>{msg.text}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Fair procedure checklist</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Investigate first and capture evidence while it is fresh (photos, statements, witnesses).</li>
            <li>Tell the employee what they are accused of, in a language they understand, and give them a chance to respond.</li>
            <li>For dismissal, hold a hearing with reasonable notice (48 hours is common) and an impartial chairperson.</li>
            <li>Consider the employee&apos;s record, length of service and any mitigating factors before deciding the sanction.</li>
            <li>Treat similar offences consistently across employees.</li>
            <li>Give the outcome in writing, explain the right to appeal, and for dismissals the right to refer a dispute to the CCMA within 30 days.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
