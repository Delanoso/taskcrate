"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";

export function NearMissAdmin() {
  const [reports, setReports] = useState<any[]>([]);
  const [publicUrl, setPublicUrl] = useState("");

  async function load() {
    const data = await jsonFetch("/api/modules/nearmiss");
    setReports(data.reports);
    setPublicUrl(data.publicUrl);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function setStatus(id: string, status: "triaged" | "closed") {
    await jsonFetch("/api/modules/nearmiss", { method: "PATCH", body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Anonymous board QR</CardTitle></CardHeader>
        <CardContent><LinkBox url={publicUrl} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between gap-2"><p>{r.description}</p><StatusBadge status={r.status} /></div>
              {r.photoUrl && <a className="text-xs underline" href={r.photoUrl} target="_blank" rel="noreferrer">Photo</a>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "triaged")}>Triage</Button>
                <Button size="sm" onClick={() => setStatus(r.id, "closed")}>Close</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
