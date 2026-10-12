"use client";

import { useEffect, useState } from "react";
import { Button, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, LinkBox, jsonFetch } from "@/components/modules/ui-bits";

type Visitor = {
  id: string;
  fullName: string;
  purpose: string;
  phone: string;
  registration: string | null;
  createdAt: string;
  checkedOutAt: string | null;
  checkedOutBy: string | null;
};

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "short", timeStyle: "short" });

export function VisitorAdmin() {
  const [site, setSite] = useState<any>(null);
  const [onSite, setOnSite] = useState<Visitor[]>([]);
  const [publicUrl, setPublicUrl] = useState("");
  const [protocol, setProtocol] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch("/api/modules/visitor");
    setSite(data.site);
    setOnSite(data.onSite ?? []);
    setPublicUrl(data.publicUrl);
    setProtocol(data.site.protocolText);
  }
  useEffect(() => { load().catch(console.error); }, []);

  async function save() {
    await jsonFetch("/api/modules/visitor", {
      method: "PATCH",
      body: JSON.stringify({ protocolText: protocol }),
    });
    load();
  }

  async function checkOut(body: { visitorId: string } | { all: true }) {
    setBusyId("visitorId" in body ? body.visitorId : "all");
    setError(null);
    try {
      await jsonFetch("/api/modules/visitor/checkout", { method: "POST", body: JSON.stringify(body) });
      setConfirmAll(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check out");
    } finally {
      setBusyId(null);
    }
  }

  if (!site) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>On site now ({onSite.length})</CardTitle>
            <CardDescription>Visitors who have not checked out. Check them out if they forgot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {onSite.length === 0 ? (
              <p className="text-muted-foreground">Nobody is checked in.</p>
            ) : (
              <>
                {onSite.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 border-b py-2">
                    <div className="min-w-0">
                      <p className="font-medium">{v.fullName}</p>
                      <p className="truncate text-muted-foreground">
                        {v.purpose} · {v.phone}{v.registration ? ` · ${v.registration}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">In {fmt(v.createdAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() => checkOut({ visitorId: v.id })}
                    >
                      {busyId === v.id ? "…" : "Check out"}
                    </Button>
                  </div>
                ))}
                {onSite.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {confirmAll ? (
                      <>
                        <Button size="sm" variant="destructive" disabled={busyId !== null} onClick={() => checkOut({ all: true })}>
                          {busyId === "all" ? "Checking out…" : `Yes, check out all ${onSite.length}`}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmAll(false)}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmAll(true)}>
                        Check out everyone still on site
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
            {error && <p className="text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{site.name} QR / link</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <LinkBox url={publicUrl} />
            <p className="text-sm text-muted-foreground">
              Print this as a static QR at the gate. Visitors scan it to check in, and again to check out.
            </p>
            <div className="space-y-2">
              <Label>Protocol text pushed via WhatsApp</Label>
              <textarea className="min-h-40 w-full rounded-md border p-3 text-sm" value={protocol} onChange={(e) => setProtocol(e.target.value)} />
            </div>
            <Button onClick={save}>Save protocol</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader><CardTitle>Visitor ledger</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(site.visitors ?? []).map((v: Visitor) => (
            <div key={v.id} className="border-b py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{v.fullName}</p>
                {v.checkedOutAt ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Left</span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300">On site</span>
                )}
              </div>
              <p className="text-muted-foreground">{v.purpose} · {v.phone}</p>
              <p className="text-xs text-muted-foreground">
                In {fmt(v.createdAt)}
                {v.checkedOutAt && (
                  <> · Out {fmt(v.checkedOutAt)}{v.checkedOutBy ? ` (${v.checkedOutBy === "Visitor" ? "self" : `by ${v.checkedOutBy}`})` : ""}</>
                )}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
