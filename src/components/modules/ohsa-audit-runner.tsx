"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, FileDown, Loader2, MessageSquarePlus, X } from "lucide-react";
import { Button, jsonFetch } from "@/components/modules/ui-bits";
import { fileToCompressedDataUrl } from "@/lib/image-compress";
import {
  AUDIT_QUESTIONS,
  AUDIT_SECTIONS,
  MAX_PHOTOS_PER_QUESTION,
  auditSummary,
  type AuditAnswer,
  type AuditQuestion,
} from "@/lib/modules/ohsa-audit-items";

type Answer = { answer: AuditAnswer | null; note: string | null; photos: string[] };
type Audit = {
  id: string;
  title: string;
  monthLabel: string;
  auditorName: string | null;
  status: string;
  answers: ({ questionId: string } & Answer)[];
};
type Filter = "all" | "open" | "findings";

const EMPTY: Answer = { answer: null, note: null, photos: [] };

const CHOICES: { value: AuditAnswer; label: string; on: string }[] = [
  { value: "yes", label: "Yes", on: "border-green-600 bg-green-600 text-white" },
  { value: "no", label: "No", on: "border-red-600 bg-red-600 text-white" },
  { value: "na", label: "N/A", on: "border-zinc-500 bg-zinc-500 text-white" },
];

export function AuditRunner({ auditId, onBack }: { auditId: string; onBack: () => void }) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [sectionId, setSectionId] = useState(AUDIT_SECTIONS[0].id);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  function apply(data: { audit: Audit }) {
    setAudit(data.audit);
    setAnswers(Object.fromEntries(data.audit.answers.map(({ questionId, ...a }) => [questionId, a])));
  }
  const load = () => jsonFetch<{ audit: Audit }>(`/api/modules/ohsa/${auditId}`).then(apply);
  useEffect(() => {
    jsonFetch<{ audit: Audit }>(`/api/modules/ohsa/${auditId}`)
      .then(apply)
      .catch((e) => setError(e.message));
  }, [auditId]);

  const locked = audit?.status === "completed";
  const summary = useMemo(
    () => auditSummary(Object.entries(answers).map(([questionId, a]) => ({ questionId, answer: a.answer }))),
    [answers],
  );

  function patchLocal(qid: string, patch: Partial<Answer>) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...EMPTY, ...prev[qid], ...patch } }));
  }

  async function save(qid: string, patch: { answer?: AuditAnswer | null; note?: string | null }) {
    const before = answers[qid] ?? EMPTY;
    patchLocal(qid, patch);
    setError(null);
    try {
      await jsonFetch(`/api/modules/ohsa/${auditId}/answers`, {
        method: "PUT",
        body: JSON.stringify({ questionId: qid, ...patch }),
      });
    } catch (e) {
      patchLocal(qid, before);
      setError(e instanceof Error ? e.message : "Could not save — check your connection.");
    }
  }

  async function markNa(qs: AuditQuestion[]) {
    for (const q of qs) if (!answers[q.id]?.answer) await save(q.id, { answer: "na" });
  }

  async function complete(action: "complete" | "reopen") {
    setBusy(true);
    setError(null);
    try {
      await jsonFetch(`/api/modules/ohsa/${auditId}`, { method: "PATCH", body: JSON.stringify({ action }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!audit) {
    return error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-sm text-muted-foreground">Loading audit…</p>;
  }

  const section = AUDIT_SECTIONS.find((s) => s.id === sectionId)!;
  const visible = (q: AuditQuestion) => {
    const a = answers[q.id]?.answer;
    return filter === "all" || (filter === "open" ? !a : a === "no");
  };
  const sectionIndex = AUDIT_SECTIONS.indexOf(section);

  return (
    <div className="space-y-4" ref={topRef}>
      <div className="sticky top-0 z-10 -mx-1 space-y-3 rounded-b-xl border-b bg-background/95 px-1 pt-1 pb-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onBack}>
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{audit.title}</h2>
              <p className="text-xs text-muted-foreground">
                {audit.monthLabel}
                {audit.auditorName ? ` · ${audit.auditorName}` : ""}
                {locked ? " · Completed" : " · Saves automatically"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`/api/modules/ohsa/${auditId}/pdf`} target="_blank" rel="noreferrer">
                <FileDown className="size-4" /> PDF report
              </a>
            </Button>
            {locked ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => complete("reopen")}>Reopen</Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => complete("complete")}>Complete audit</Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(summary.answered / summary.total) * 100}%` }} />
          </div>
          <span className="shrink-0 text-muted-foreground">{summary.answered}/{summary.total}</span>
          <span className="shrink-0 font-medium text-green-700">{summary.yes} yes</span>
          <span className="shrink-0 font-medium text-red-700">{summary.no} no</span>
          <span className="shrink-0 font-semibold">{summary.compliance === null ? "–" : `${summary.compliance}%`}</span>
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {AUDIT_SECTIONS.map((s) => {
            const qs = AUDIT_QUESTIONS.filter((q) => q.sectionId === s.id);
            const done = qs.filter((q) => answers[q.id]?.answer).length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSectionId(s.id)}
                className={`shrink-0 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                  s.id === sectionId ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <span className="block font-semibold">{s.id}. {s.title}</span>
                <span className="text-muted-foreground">{done}/{qs.length}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1 text-xs">
          {([["all", "All"], ["open", "Unanswered"], ["findings", `Findings (${summary.no})`]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-2.5 py-1 font-medium ${filter === key ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {section.subsections.map((sub) => {
        const qs = AUDIT_QUESTIONS.filter((q) => q.subsectionId === sub.id);
        const shown = qs.filter(visible);
        if (!shown.length) return null;
        const unanswered = qs.filter((q) => !answers[q.id]?.answer);
        return (
          <section key={sub.id} className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <h3 className="text-sm font-semibold">
                <span className="text-muted-foreground">{sub.id}</span> {sub.title}
              </h3>
              {!locked && unanswered.length > 0 && (
                <button type="button" onClick={() => markNa(unanswered)} className="shrink-0 text-xs text-muted-foreground underline">
                  N/A for the rest
                </button>
              )}
            </div>
            <div className="divide-y rounded-lg border bg-card">
              {shown.map((q) => (
                <QuestionRow
                  key={q.id}
                  auditId={auditId}
                  question={q}
                  value={answers[q.id] ?? EMPTY}
                  locked={locked}
                  onSave={(patch) => save(q.id, patch)}
                  onPhotos={(photos) => patchLocal(q.id, { photos })}
                  onError={setError}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div className="flex justify-between gap-2 pt-2">
        <Button
          variant="outline"
          disabled={sectionIndex === 0}
          onClick={() => { setSectionId(AUDIT_SECTIONS[sectionIndex - 1].id); topRef.current?.scrollIntoView(); }}
        >
          Previous section
        </Button>
        {sectionIndex < AUDIT_SECTIONS.length - 1 ? (
          <Button onClick={() => { setSectionId(AUDIT_SECTIONS[sectionIndex + 1].id); topRef.current?.scrollIntoView(); }}>
            Next section
          </Button>
        ) : (
          !locked && <Button disabled={busy} onClick={() => complete("complete")}>Complete audit</Button>
        )}
      </div>
    </div>
  );
}

function QuestionRow({
  auditId,
  question,
  value,
  locked,
  onSave,
  onPhotos,
  onError,
}: {
  auditId: string;
  question: AuditQuestion;
  value: Answer;
  locked: boolean;
  onSave: (patch: { answer?: AuditAnswer | null; note?: string | null }) => void;
  onPhotos: (photos: string[]) => void;
  onError: (msg: string | null) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(!!value.note);
  const [note, setNote] = useState(value.note ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const showNote = noteOpen || value.answer === "no" || !!value.note;

  async function addPhoto(file: File) {
    setUploading(true);
    onError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const data = await jsonFetch<{ photos: string[] }>(`/api/modules/ohsa/${auditId}/answers`, {
        method: "POST",
        body: JSON.stringify({ questionId: question.id, dataUrl }),
      });
      onPhotos(data.photos);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(url: string) {
    try {
      const data = await jsonFetch<{ photos: string[] }>(`/api/modules/ohsa/${auditId}/answers`, {
        method: "DELETE",
        body: JSON.stringify({ questionId: question.id, url }),
      });
      onPhotos(data.photos);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not remove photo");
    }
  }

  return (
    <div className={`space-y-2 p-3 ${value.answer === "no" ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}>
      <p className="text-sm">
        <span className="mr-1 font-medium text-muted-foreground">{question.letter})</span>
        {question.text}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            disabled={locked}
            onClick={() => onSave({ answer: value.answer === c.value ? null : c.value })}
            className={`min-w-14 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              value.answer === c.value ? c.on : "bg-background hover:bg-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
        {!locked && (
          <>
            <button
              type="button"
              disabled={uploading || value.photos.length >= MAX_PHOTOS_PER_QUESTION}
              onClick={() => fileRef.current?.click()}
              className="ml-auto flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              <span className="hidden sm:inline">Photo</span>
            </button>
            {!showNote && (
              <button type="button" onClick={() => setNoteOpen(true)} className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted">
                <MessageSquarePlus className="size-4" />
                <span className="hidden sm:inline">Note</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); }}
            />
          </>
        )}
      </div>

      {value.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.photos.map((url) => (
            <div key={url} className="relative">
              <a href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Audit evidence" className="size-20 rounded-md border object-cover" />
              </a>
              {!locked && (
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 rounded-full border bg-background p-0.5 shadow-sm hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showNote && (
        <textarea
          value={note}
          disabled={locked}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if ((note.trim() || null) !== (value.note ?? null)) onSave({ note: note.trim() || null }); }}
          rows={2}
          placeholder={value.answer === "no" ? "Describe the finding / corrective action…" : "Note…"}
          className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
        />
      )}
    </div>
  );
}
