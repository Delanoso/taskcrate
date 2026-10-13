"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, LinkBox, jsonFetch } from "@/components/modules/ui-bits";
import { selectClass } from "@/components/modules/leave/request-form";
import type { LeaveData, LevelRule } from "@/components/modules/leave/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MODE_LABEL: Record<string, string> = { approve: "Needs approval", auto: "Auto-approve (if balance allows)", block: "Block all requests" };

export function LeaveSettingsTab({ data, reload }: { data: LeaveData; reload: () => Promise<unknown> }) {
  const [workDays, setWorkDays] = useState(data.settings.workDays);
  const [allowNegative, setAllowNegative] = useState(data.settings.allowNegative);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState({ levelName: "", mode: "approve" });

  async function saveSettings() {
    setError(null);
    setSaved(false);
    try {
      await jsonFetch("/api/modules/leave", { method: "PUT", body: JSON.stringify({ workDays, allowNegative }) });
      await reload();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function addLevel(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await jsonFetch("/api/modules/leave", { method: "POST", body: JSON.stringify({ ...newLevel, blackoutDates: [] }) });
      setNewLevel({ levelName: "", mode: "approve" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  const toggleDay = (d: string) =>
    setWorkDays((w) => (w.includes(d) ? w.replace(d, "") : [...w, d].sort().join("")));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee request link</CardTitle>
            <CardDescription>
              Share this in the staff WhatsApp group. Employees enter the cellphone number on the leave register to request leave.
              Each employee also has a personal link (Employees tab) that shows their balance.
            </CardDescription>
          </CardHeader>
          <CardContent><LinkBox url={data.requestUrl} /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Working week</CardTitle>
            <CardDescription>Only working days are deducted. South African public holidays are skipped automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((label, i) => {
                const d = String(i + 1);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium ${workDays.includes(d) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} />
              <span>
                Let employees request more leave than they have
                <span className="block text-xs text-muted-foreground">When off, requests that exceed the balance are refused. Managers can always record leave.</span>
              </span>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-3">
              <Button onClick={saveSettings} disabled={!workDays}>Save</Button>
              {saved && <span className="text-sm text-green-700">Saved</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Levels &amp; approval rules</CardTitle>
          <CardDescription>
            Each employee has a level. Choose whether that level&apos;s requests need approval or are approved automatically, and add
            blackout dates when nobody at that level may take leave (e.g. stock-take).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.rules.map((r) => <RuleRow key={r.id} rule={r} canDelete={data.canDelete} reload={reload} onError={setError} />)}
          <form onSubmit={addLevel} className="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="New level, e.g. Managers" required value={newLevel.levelName} onChange={(e) => setNewLevel({ ...newLevel, levelName: e.target.value })} />
            <select className={selectClass} value={newLevel.mode} onChange={(e) => setNewLevel({ ...newLevel, mode: e.target.value })}>
              {Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Button type="submit">Add</Button>
          </form>
          <p className="text-xs text-muted-foreground">Levels without a rule need approval.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RuleRow({ rule, canDelete, reload, onError }: { rule: LevelRule; canDelete: boolean; reload: () => Promise<unknown>; onError: (e: string | null) => void }) {
  const [date, setDate] = useState("");

  async function save(mode: string, blackoutDates: string[]) {
    onError(null);
    try {
      await jsonFetch("/api/modules/leave", { method: "POST", body: JSON.stringify({ levelName: rule.levelName, mode, blackoutDates }) });
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function remove() {
    try {
      await jsonFetch(`/api/modules/leave?level=${encodeURIComponent(rule.levelName)}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove");
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{rule.levelName}</p>
        <div className="flex items-center gap-2">
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={rule.mode} onChange={(e) => save(e.target.value, rule.blackoutDates)}>
            {Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {canDelete && (
            <button type="button" aria-label={`Remove ${rule.levelName}`} onClick={remove} className="text-muted-foreground hover:text-destructive">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {rule.blackoutDates.map((d) => (
          <span key={d} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            {d}
            <button type="button" aria-label={`Remove ${d}`} onClick={() => save(rule.mode, rule.blackoutDates.filter((x) => x !== d))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Label htmlFor={`bo-${rule.id}`} className="sr-only">Add blackout date</Label>
        <Input id={`bo-${rule.id}`} type="date" className="h-7 w-auto text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!date} onClick={() => { save(rule.mode, [...rule.blackoutDates, date]); setDate(""); }}>
          Add blackout
        </Button>
      </div>
    </div>
  );
}
