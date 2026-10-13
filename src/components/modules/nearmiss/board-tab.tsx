"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, jsonFetch } from "@/components/modules/ui-bits";
import { QrCard } from "@/components/modules/qr-card";
import type { NearMissData } from "@/components/modules/nearmiss/types";

export function BoardTab({ data, setData }: { data: NearMissData; setData: (d: NearMissData) => void }) {
  const [locations, setLocations] = useState(data.locations);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(locations) !== JSON.stringify(data.locations);

  function add() {
    const names = draft.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setLocations([...new Set([...locations, ...names])]);
    setDraft("");
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const d = await jsonFetch<{ locations: string[] }>("/api/modules/nearmiss", { method: "PUT", body: JSON.stringify({ locations }) });
      setData({ ...data, locations: d.locations });
      setLocations(d.locations);
      setMsg({ ok: true, text: "Areas saved — they now show on the report form." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>QR board poster</CardTitle>
          <CardDescription>
            Print this and put it up in the workshop, canteen, gate and change rooms. Anyone can scan it to report a hazard — no app, no login, anonymous by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QrCard
            url={data.publicUrl}
            company={data.company}
            title="See something unsafe? Report it."
            subtitle="Near misses, hazards and unsafe acts. Anonymous — your name is never recorded unless you add it."
            fileName="near-miss-qr"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Areas on site</CardTitle>
          <CardDescription>
            Reporters pick from this list, which keeps the hot-spot chart accurate. They can still type a different place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.canManage ? (
            <>
              <div className="flex flex-wrap gap-2">
                {locations.length === 0 && <p className="text-sm text-muted-foreground">No areas yet.</p>}
                {locations.map((l) => (
                  <span key={l} className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-3 pr-1 text-sm">
                    {l}
                    <button type="button" aria-label={`Remove ${l}`} onClick={() => setLocations(locations.filter((x) => x !== l))} className="rounded-full p-0.5 hover:bg-muted">
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="e.g. Workshop, Stores, Wash bay (comma separated)" value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
                <Button variant="outline" onClick={add}>Add</Button>
              </div>
              <Button disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : "Save areas"}</Button>
              {msg && <p className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>{msg.text}</p>}
            </>
          ) : (
            <p className="text-sm">{data.locations.join(", ") || "No areas set. Ask a manager to add them."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
