"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";

export function LeaveAdmin() {
  const [rules, setRules] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestUrl, setRequestUrl] = useState("");
  const [levelName, setLevelName] = useState("Staff");
  const [mode, setMode] = useState("approve");

  async function load() {
    const d = await jsonFetch("/api/modules/leave");
    setRules(d.rules); setRequests(d.requests); setRequestUrl(d.requestUrl);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    await jsonFetch("/api/modules/leave", { method: "POST", body: JSON.stringify({ levelName, mode }) });
    load();
  }

  async function decide(id: string, status: "approved" | "rejected") {
    await jsonFetch("/api/modules/leave", { method: "PATCH", body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Level rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <LinkBox url={requestUrl} />
          <form onSubmit={saveRule} className="space-y-3">
            <div className="space-y-2"><Label>Level</Label><Input value={levelName} onChange={(e) => setLevelName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <select className="h-9 w-full rounded-md border px-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="approve">Requires approval</option>
                <option value="auto">Auto-approve</option>
                <option value="block">Block</option>
              </select>
            </div>
            <Button type="submit">Save rule</Button>
          </form>
          <ul className="text-sm space-y-1">{rules.map((r) => <li key={r.id}>{r.levelName}: {r.mode}</li>)}</ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Requests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">{r.employeeName}</span><StatusBadge status={r.status} /></div>
              <p className="text-muted-foreground">{r.employeeLevel} · {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</p>
              {r.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => decide(r.id, "approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}>Reject</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
