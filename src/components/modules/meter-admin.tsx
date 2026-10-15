"use client";

import { useEffect, useState } from "react";
import { CheckForm, ReadingForm, type CheckPayload, type ReadingPayload } from "@/components/modules/meter-forms";
import { ReadingSheet } from "@/components/modules/meter-sheet";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LinkBox, jsonFetch } from "@/components/modules/ui-bits";
import { formatAmount, formatWhen, meterTypeLabel, type SiteDetail, type SiteSummary } from "@/lib/modules/meter-shared";

export function MeterAdmin() {
  const [items, setItems] = useState<SiteSummary[]>([]);
  const [selected, setSelected] = useState<SiteDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await jsonFetch<{ sites: SiteSummary[] }>("/api/modules/meter");
    setItems(data.sites);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load the meters."));
  }, []);

  async function openSite(id: string) {
    setAdding(false);
    setError(null);
    const data = await jsonFetch<{ site: SiteDetail }>(`/api/modules/meter?id=${id}`);
    setSelected(data.site);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each reading keeps a photo of the meter, the reader’s name and signature, and the date and time. A spike against the recent baseline is flagged for a signed check. Download the log as a PDF.
        </p>
        <Button type="button" onClick={() => { setAdding(true); setSelected(null); }}>Add a meter</Button>
      </div>
      {error && !selected && <p className="text-sm text-destructive">{error}</p>}

      {adding && (
        <AddMeter
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            load().catch(() => undefined);
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No meters yet.</p>}
        {items.map((site) => (
          <button
            key={site.id}
            type="button"
            onClick={() => openSite(site.id).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not open that meter."))}
            className={`rounded-xl border bg-card p-4 text-left hover:bg-muted ${selected?.id === site.id ? "border-primary" : ""}`}
          >
            <span className="font-medium">{site.name}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {meterTypeLabel(site.meterType)}{site.meterNumber ? ` · ${site.meterNumber}` : ""}
            </span>
            <span className={`mt-1 block text-xs ${site.alertOpen ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              {site.lastReading == null
                ? "No readings yet"
                : `${formatAmount(site.lastReading, site.unit)} · ${formatWhen(site.lastAt)}${site.alertOpen ? " · Needs a check" : ""}`}
            </span>
          </button>
        ))}
      </div>

      {selected && origin && (
        <MeterDesk
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

function AddMeter({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [meterType, setMeterType] = useState("water");
  const [meterNumber, setMeterNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [location, setLocation] = useState("");
  const [alertPhone, setAlertPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await jsonFetch("/api/modules/meter", {
        method: "POST",
        body: JSON.stringify({
          action: "create_site",
          name: name.trim(),
          meterType,
          meterNumber: meterNumber.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          municipality: municipality.trim() || undefined,
          location: location.trim() || undefined,
          alertPhone: alertPhone.trim() || undefined,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the meter.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Add a meter</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Name</span><Input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Unit 12" /></label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Type</span>
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={meterType} onChange={(event) => setMeterType(event.target.value)}>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Meter number</span><Input value={meterNumber} onChange={(event) => setMeterNumber(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Municipal account</span><Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Municipality</span><Input value={municipality} onChange={(event) => setMunicipality(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Location</span><Input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="block space-y-1.5 text-sm sm:col-span-2"><span className="font-medium">Alert WhatsApp number</span><Input value={alertPhone} onChange={(event) => setAlertPhone(event.target.value)} /></label>
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

function MeterDesk({
  site,
  origin,
  onBack,
  onChange,
}: {
  site: SiteDetail;
  origin: string;
  onBack: () => void;
  onChange: (site: SiteDetail) => void;
}) {
  const [mode, setMode] = useState<"reading" | "check" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertLink, setAlertLink] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const openFlag = site.readings.find((reading) => reading.alerted && !reading.checkedAt) ?? null;

  async function refresh() {
    const data = await jsonFetch<{ site: SiteDetail }>(`/api/modules/meter?id=${site.id}`);
    setFormKey((value) => value + 1);
    onChange(data.site);
  }

  async function saveReading(payload: ReadingPayload) {
    setBusy(true);
    setError(null);
    try {
      const data = await jsonFetch<{ alerted: boolean; whatsAppUrl: string | null }>("/api/modules/meter", {
        method: "POST",
        body: JSON.stringify({ action: "reading", siteId: site.id, ...payload }),
      });
      setAlertLink(data.alerted ? data.whatsAppUrl : null);
      setMode(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that reading.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCheck(payload: CheckPayload) {
    if (!openFlag) return;
    setBusy(true);
    setError(null);
    try {
      await jsonFetch("/api/modules/meter", {
        method: "POST",
        body: JSON.stringify({ action: "check", readingId: openFlag.id, ...payload }),
      });
      setMode(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that check.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back to meters</Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <a href={`/api/modules/meter/${site.id}/pdf`} target="_blank" rel="noreferrer">Download the log</a>
          </Button>
          <Button type="button" onClick={() => setMode("reading")}>Log a reading</Button>
          {openFlag && <Button type="button" variant="outline" onClick={() => setMode("check")}>Check the flagged reading</Button>}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>{site.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {meterTypeLabel(site.meterType)} · {site.unit}
            {site.meterNumber ? ` · Meter ${site.meterNumber}` : ""}
            {site.accountNumber ? ` · Account ${site.accountNumber}` : ""}
          </p>
          {site.municipality && <p className="text-muted-foreground">{site.municipality}</p>}
          {site.location && <p className="text-muted-foreground">{site.location}</p>}
          <p className="font-medium">Reading link</p>
          <LinkBox url={`${origin}/p/meter/${site.publicToken}`} />
          {alertLink && <a className="block underline text-destructive" href={alertLink} target="_blank" rel="noreferrer">Open the WhatsApp alert</a>}
        </CardContent>
      </Card>

      {mode === "reading" && (
        <Card>
          <CardHeader><CardTitle>Reading</CardTitle></CardHeader>
          <CardContent>
            <ReadingForm key={formKey} unit={site.unit} lastReading={site.lastReading} busy={busy} onSubmit={saveReading} />
          </CardContent>
        </Card>
      )}
      {mode === "check" && openFlag && (
        <Card>
          <CardHeader><CardTitle>Check the flagged reading</CardTitle></CardHeader>
          <CardContent>
            <CheckForm key={formKey} busy={busy} onSubmit={saveCheck} />
          </CardContent>
        </Card>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {site.readings.length === 0 && <p className="text-sm text-muted-foreground">No readings yet.</p>}
        {site.readings.map((reading) => <ReadingSheet key={reading.id} reading={reading} unit={site.unit} />)}
      </div>
    </div>
  );
}
