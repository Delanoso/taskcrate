"use client";

import { useEffect, useState } from "react";
import { ObForm, type ObPayload } from "@/components/modules/ob-forms";
import { ObSheet } from "@/components/modules/ob-sheet";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LinkBox, jsonFetch } from "@/components/modules/ui-bits";
import { formatWhen, type ObEntryView, type ObSiteDetail, type ObSiteSummary } from "@/lib/modules/ob-shared";

export function ObAdmin() {
  const [items, setItems] = useState<ObSiteSummary[]>([]);
  const [selected, setSelected] = useState<ObSiteDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch<{ sites: ObSiteSummary[] }>("/api/modules/ob");
    setItems(data.sites);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load the occurrence book."));
  }, []);

  async function openSite(id: string) {
    setAdding(false);
    setError(null);
    const data = await jsonFetch<{ site: ObSiteDetail }>(`/api/modules/ob?id=${id}`);
    setSelected(data.site);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each entry keeps the guard’s name, a photo, a signature, and the time it was filed. Filed entries stay as they were signed. A quiet site can send a wake-up to the guard and the control room.
        </p>
        <Button type="button" onClick={() => { setAdding(true); setSelected(null); }}>Add a site</Button>
      </div>
      {error && !selected && <p className="text-sm text-destructive">{error}</p>}

      {adding && (
        <AddSite
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            load().catch(() => undefined);
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No sites yet.</p>}
        {items.map((site) => (
          <button
            key={site.id}
            type="button"
            onClick={() => openSite(site.id).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not open that site."))}
            className={`rounded-xl border bg-card p-4 text-left hover:bg-muted ${selected?.id === site.id ? "border-primary" : ""}`}
          >
            <span className="font-medium">{site.name}</span>
            {site.location && <span className="mt-1 block text-sm text-muted-foreground">{site.location}</span>}
            <span className={`mt-1 block text-xs ${site.wakeDue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              {site.lastAt
                ? `${site.lastCategory} · ${formatWhen(site.lastAt)}${site.wakeDue ? " · Wake-up due" : ""}`
                : "No entries yet"}
            </span>
          </button>
        ))}
      </div>

      {selected && origin && (
        <SiteDesk
          site={selected}
          origin={origin}
          onBack={() => setSelected(null)}
          onChange={(site) => {
            setSelected(site);
            load().catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}

function AddSite({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [guardPhone, setGuardPhone] = useState("");
  const [controlPhone, setControlPhone] = useState("");
  const [wakeMinutes, setWakeMinutes] = useState("60");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await jsonFetch("/api/modules/ob", {
        method: "POST",
        body: JSON.stringify({
          action: "create_site",
          name: name.trim(),
          location: location.trim() || undefined,
          guardPhone: guardPhone.trim() || undefined,
          controlPhone: controlPhone.trim() || undefined,
          wakeMinutes: Number(wakeMinutes) || 60,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the site.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Add a site</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Site name</span><Input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Location</span><Input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Guard phone</span><Input value={guardPhone} onChange={(event) => setGuardPhone(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Control room phone</span><Input value={controlPhone} onChange={(event) => setControlPhone(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Wake-up after (minutes)</span><Input type="number" min={15} max={240} value={wakeMinutes} onChange={(event) => setWakeMinutes(event.target.value)} /></label>
          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>Add</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SiteDesk({
  site,
  origin,
  onBack,
  onChange,
}: {
  site: ObSiteDetail;
  origin: string;
  onBack: () => void;
  onChange: (site: ObSiteDetail) => void;
}) {
  const [logging, setLogging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wakeNote, setWakeNote] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function send(payload: ObPayload) {
    setBusy(true);
    setError(null);
    try {
      await jsonFetch("/api/modules/ob", {
        method: "POST",
        body: JSON.stringify({ action: "entry", siteId: site.id, ...payload }),
      });
      const data = await jsonFetch<{ site: ObSiteDetail }>(`/api/modules/ob?id=${site.id}`);
      setLogging(false);
      setFormKey((value) => value + 1);
      onChange(data.site);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not file that entry.");
    } finally {
      setBusy(false);
    }
  }

  async function wake() {
    setWakeNote(null);
    const data = await jsonFetch<{ wake: boolean; message?: string; guardWhatsApp?: string | null; controlWhatsApp?: string | null }>(
      `/api/modules/ob/public/${site.publicToken}`,
      { method: "PATCH", body: "{}" },
    );
    if (!data.wake) {
      setWakeNote("An entry was filed inside the wake-up window.");
      return;
    }
    setWakeNote(data.message ?? "Wake-up sent.");
    if (data.guardWhatsApp) window.open(data.guardWhatsApp, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back to sites</Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <a href={`/api/modules/ob/${site.id}/pdf`} target="_blank" rel="noreferrer">Download the OB</a>
          </Button>
          <Button type="button" variant="outline" onClick={() => wake().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not run the wake-up."))}>Wake-up check</Button>
          <Button type="button" onClick={() => setLogging(true)}>File an entry</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>{site.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {site.location && <p className="text-muted-foreground">{site.location}</p>}
          <p className="text-muted-foreground">Wake-up after {site.wakeMinutes} minutes without an entry.</p>
          {site.wakeDue && <p className="font-medium text-destructive">The wake-up window is open.</p>}
          <p className="font-medium">Guard link</p>
          <LinkBox url={`${origin}/p/ob/${site.publicToken}`} />
          {wakeNote && <p>{wakeNote}</p>}
        </CardContent>
      </Card>

      {logging && (
        <Card>
          <CardHeader><CardTitle>File an entry</CardTitle></CardHeader>
          <CardContent>
            <ObForm key={formKey} busy={busy} onSubmit={send} />
          </CardContent>
        </Card>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {site.entries.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
        {site.entries.map((entry: ObEntryView) => <ObSheet key={entry.id} entry={entry} />)}
      </div>
    </div>
  );
}
