"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Paperclip, PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TalkPage } from "@/components/toolbox/talk-page";
import { LinkActions } from "@/components/modules/link-actions";
import {
  TALK_CATEGORIES,
  TALK_LIBRARY,
  type TalkCategory,
} from "@/data/toolbox-library";

type Talk = {
  id: string;
  title: string;
  weekLabel: string;
  publicToken: string;
  status: string;
  createdAt: string;
  librarySlug: string | null;
  attachmentName: string | null;
  _count: { attendances: number };
};

type Attendance = {
  id: string;
  firstName: string;
  lastName: string;
  signedAt: string;
};

function currentWeekLabel() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const month = now.toLocaleString("en-ZA", { month: "short" });
  return `Week ${week} · ${month} ${now.getFullYear()}`;
}

const CATEGORY_KEYS = Object.keys(TALK_CATEGORIES) as TalkCategory[];

export function ToolboxAdmin({ orgSlug }: { orgSlug: string }) {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"library" | "custom">("library");
  const [category, setCategory] = useState<TalkCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [weekLabel, setWeekLabel] = useState(currentWeekLabel);
  const [scheduledOn, setScheduledOn] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadTalks = useCallback(async () => {
    const res = await fetch("/api/toolbox/talks");
    const data = await res.json();
    if (data.talks) setTalks(data.talks);
  }, []);

  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  const usedSlugs = useMemo(
    () => new Set(talks.map((t) => t.librarySlug).filter(Boolean)),
    [talks],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TALK_LIBRARY.filter(
      (t) =>
        (category === "all" || t.category === category) &&
        (!q || t.title.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)),
    );
  }, [category, query]);

  const preview = previewSlug ? TALK_LIBRARY.find((t) => t.slug === previewSlug) : undefined;

  async function afterCreate(res: Response) {
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not publish talk");
      return false;
    }
    setMessage("Talk published — share the link below on WhatsApp.");
    await loadTalks();
    openTalk(data.talk.id);
    return true;
  }

  async function publishLibrary() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/toolbox/talks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ librarySlug: preview.slug, weekLabel, scheduledOn }),
    });
    if (await afterCreate(res)) setPreviewSlug(null);
  }

  async function publishCustom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (file && file.size > 15 * 1024 * 1024) {
      setError("File is too large (max 15 MB).");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/toolbox/talks", { method: "POST", body: new FormData(form) });
    if (await afterCreate(res)) form.reset();
  }

  async function openTalk(id: string) {
    setSelectedId(id);
    setConfirmDelete(false);
    const res = await fetch(`/api/toolbox/talks/${id}/attendances`);
    const data = await res.json();
    setAttendances(data.talk?.attendances ?? []);
  }

  async function deleteTalk(id: string) {
    setError(null);
    const res = await fetch(`/api/toolbox/talks/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not delete talk");
      return;
    }
    setSelectedId(null);
    setConfirmDelete(false);
    setMessage("Talk deleted.");
    loadTalks();
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

  const weekInput = (
    <div className="space-y-2">
      <Label htmlFor="weekLabel">Week label</Label>
      <Input
        id="weekLabel"
        name="weekLabel"
        required
        value={weekLabel}
        onChange={(e) => setWeekLabel(e.target.value)}
      />
      <Label htmlFor="scheduledOn">Date of the talk</Label>
      <Input id="scheduledOn" name="scheduledOn" type="date" value={scheduledOn} onChange={(e) => setScheduledOn(e.target.value)} />
      <p className="text-xs text-muted-foreground">If nobody has signed by this date, it is on the morning email.</p>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="self-start">
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Create this week&apos;s talk</CardTitle>
            <CardDescription>
              Pick a ready-made talk or upload your own. One link for the whole staff WhatsApp
              group — signatures appear here live.
            </CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(
              [
                ["library", BookOpen, `Talk library (${TALK_LIBRARY.length})`],
                ["custom", PenLine, "Write / upload your own"],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tab === "library" && preview && (
            <div className="space-y-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewSlug(null)}>
                <ArrowLeft className="size-4" /> Back to library
              </Button>
              <TalkPage key={preview.slug} talk={preview} />
              {weekInput}
              <Button type="button" className="w-full" disabled={loading} onClick={publishLibrary}>
                {loading ? "Publishing…" : "Use this talk & get link"}
              </Button>
            </div>
          )}

          {tab === "library" && !preview && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search talks… e.g. forklift, ladder, heat"
                  className="pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", ...CATEGORY_KEYS] as const).map((key) => {
                  const active = category === key;
                  const accent = key === "all" ? undefined : TALK_CATEGORIES[key].accent;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        active ? "text-white" : "hover:bg-muted"
                      }`}
                      style={
                        active
                          ? { background: accent ?? "var(--foreground)", borderColor: accent ?? "var(--foreground)" }
                          : undefined
                      }
                    >
                      {key === "all" ? "All" : TALK_CATEGORIES[key].label}
                    </button>
                  );
                })}
              </div>
              <ul className="max-h-[32rem] space-y-1.5 overflow-y-auto pr-1">
                {filtered.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">No talks match.</li>
                )}
                {filtered.map((t) => (
                  <li key={t.slug}>
                    <button
                      type="button"
                      onClick={() => setPreviewSlug(t.slug)}
                      className="flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full"
                        style={{ background: TALK_CATEGORIES[t.category].accent }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {t.title}
                          {usedSlugs.has(t.slug) && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                              used
                            </span>
                          )}
                        </span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{t.summary}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "custom" && (
            <form onSubmit={publishCustom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="Working at heights refresher" />
              </div>
              {weekInput}
              <div className="space-y-2">
                <Label htmlFor="content">Talk notes</Label>
                <textarea
                  id="content"
                  name="content"
                  rows={6}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Key rules staff must read… (optional if you upload a file)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Upload PDF or picture (optional, max 15 MB)</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mediaUrl">Video link (optional — YouTube plays on the page)</Label>
                <Input id="mediaUrl" name="mediaUrl" type="url" placeholder="https://youtube.com/…" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Publishing…" : "Publish talk & get link"}
              </Button>
            </form>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{selected.title}</CardTitle>
              <CardDescription>
                {selected.weekLabel} · share into WhatsApp · org{" "}
                <code className="text-xs">{orgSlug}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LinkActions url={`${appUrl}/t/${selected.publicToken}`} title={selected.title} />
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
                  <a href={`/t/${selected.publicToken}`} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/toolbox/talks/${selected.id}/pdf`}>Download register PDF</a>
                </Button>
                {confirmDelete ? (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTalk(selected.id)}
                    >
                      Yes, delete talk & signatures
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </Button>
                )}
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
                  className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium">
                      {t.librarySlug ? (
                        <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : t.attachmentName ? (
                        <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                      <span className="truncate">{t.title}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.weekLabel}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t._count.attendances} signed
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
