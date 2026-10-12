"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Talk = {
  id: string;
  title: string;
  weekLabel: string;
  publicToken: string;
  status: string;
  createdAt: string;
  _count: { attendances: number };
};

type Attendance = {
  id: string;
  firstName: string;
  lastName: string;
  signedAt: string;
};

export function ToolboxAdmin({ orgSlug }: { orgSlug: string }) {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadTalks = useCallback(async () => {
    const res = await fetch("/api/toolbox/talks");
    const data = await res.json();
    if (data.talks) setTalks(data.talks);
  }, []);

  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  async function createTalk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/toolbox/talks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        weekLabel: fd.get("weekLabel"),
        content: fd.get("content"),
        mediaUrl: fd.get("mediaUrl") || "",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create talk");
      return;
    }
    e.currentTarget.reset();
    setMessage(`Talk created. Share link: ${data.publicUrl}`);
    setSelectedId(data.talk.id);
    loadTalks();
  }

  async function openTalk(id: string) {
    setSelectedId(id);
    const res = await fetch(`/api/toolbox/talks/${id}/attendances`);
    const data = await res.json();
    setAttendances(data.talk?.attendances ?? []);
  }

  function whatsappShare(token: string, title: string) {
    const url = `${appUrl}/t/${token}`;
    const text = [
      `Safety Toolbox Talk — please complete today:`,
      title,
      "",
      `Open this link, read the material, and sign:`,
      url,
    ].join("\n");
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  const selected = talks.find((t) => t.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create this week&apos;s talk</CardTitle>
          <CardDescription>
            One universal link for the whole staff WhatsApp group. Signatures appear here live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTalk} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Working at heights refresher" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekLabel">Week label</Label>
              <Input id="weekLabel" name="weekLabel" required placeholder="Week 42 · Oct 2026" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Safety material</Label>
              <textarea
                id="content"
                name="content"
                required
                minLength={10}
                rows={6}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Paste the talk notes or key rules staff must read…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">Optional video / media URL</Label>
              <Input id="mediaUrl" name="mediaUrl" type="url" placeholder="https://…" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Publish talk & get link"}
            </Button>
            {message && <p className="text-sm text-muted-foreground break-all">{message}</p>}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Talks</CardTitle>
            <CardDescription>Track completion and pull the signed register PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {talks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No talks yet.</p>
            ) : (
              talks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTalk(t.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <span>
                    <span className="font-medium">{t.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.weekLabel}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{t._count.attendances} signed</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{selected.title}</CardTitle>
              <CardDescription>
                Share into WhatsApp · org <code className="text-xs">{orgSlug}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="break-all rounded-md bg-muted p-3 font-mono text-xs">
                {appUrl}/t/{selected.publicToken}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <a
                    href={whatsappShare(selected.publicToken, selected.title)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Share on WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/toolbox/talks/${selected.id}/pdf`}>Download register PDF</a>
                </Button>
              </div>
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {attendances.length === 0 ? (
                  <li className="text-muted-foreground">No signatures yet — share the link.</li>
                ) : (
                  attendances.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 border-b py-2">
                      <span>
                        {a.firstName} {a.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.signedAt).toLocaleString()}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
