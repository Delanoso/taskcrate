"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ObForm, type ObPayload } from "@/components/modules/ob-forms";
import { ObSheet } from "@/components/modules/ob-sheet";
import { formatWhen, type ObEntryView } from "@/lib/modules/ob-shared";

type SiteInfo = {
  name: string;
  location: string | null;
  companyName: string;
  wakeDue: boolean;
  wakeMinutes: number;
  lastAt: string | null;
};

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [recent, setRecent] = useState<ObEntryView[]>([]);
  const [saved, setSaved] = useState<ObEntryView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function load() {
    return fetch(`/api/modules/ob/public/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setMissing(true);
          return;
        }
        setSite(data.site);
        setRecent(data.recent ?? []);
      })
      .catch(() => setMissing(true));
  }

  useEffect(() => {
    load().catch(() => setMissing(true));
  }, [token]);

  async function send(payload: ObPayload) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/ob/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not file that entry.");
      setSaved(data.entry);
      setFormKey((value) => value + 1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not file that entry.");
    } finally {
      setBusy(false);
    }
  }

  if (missing) return <p className="text-sm">This site could not be found.</p>;
  if (!site) return <p className="text-sm text-muted-foreground">Loading the occurrence book…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{site.companyName}</p>
        <h1 className="text-xl font-semibold">{site.name}</h1>
        {site.location && <p className="text-sm text-muted-foreground">{site.location}</p>}
        <p className="mt-1 text-sm">{site.lastAt ? `Last entry ${site.lastAt}` : "No entries yet"}</p>
        {site.wakeDue && <p className="mt-1 text-sm font-medium text-destructive">Wake-up window is open. File an entry.</p>}
      </div>

      {saved && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Filed {formatWhen(saved.createdAt)}. This entry stays as it was signed.</p>
          <ObSheet entry={saved} />
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <ObForm key={formKey} busy={busy} onSubmit={send} />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Recent entries</p>
          {recent.map((entry) => (
            <div key={entry.id} className="rounded-xl border bg-card p-3 text-sm">
              <p className="font-medium">{entry.entryNumber ? `${entry.entryNumber} · ` : ""}{entry.category}</p>
              <p className="text-muted-foreground">{formatWhen(entry.createdAt)}{entry.guardName ? ` · ${entry.guardName}` : ""}</p>
              {entry.notes && <p className="mt-1 whitespace-pre-wrap">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
