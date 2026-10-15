"use client";

import { useEffect, useState } from "react";
import { JobCardEditor } from "@/components/modules/jobcard-editor";
import { JobCardSheet } from "@/components/modules/jobcard-sheet";
import { PhotoList } from "@/components/modules/photo-list";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, LinkBox, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";
import { sideLabels, type JobCardSummary, type JobCardView, type JobMode, type JobPriority } from "@/lib/modules/jobcard-shared";

const textareaClass = "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function JobCardAdmin({ mode }: { mode: JobMode }) {
  const labels = sideLabels(mode);
  const [items, setItems] = useState<JobCardSummary[]>([]);
  const [selected, setSelected] = useState<JobCardView | null>(null);
  const [opening, setOpening] = useState(false);
  const [title, setTitle] = useState("");
  const [machineRef, setMachineRef] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<JobPriority>("normal");
  const [description, setDescription] = useState("");
  const [reportedByName, setReportedByName] = useState("");
  const [reportedByPhone, setReportedByPhone] = useState("");
  const [openComment, setOpenComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  async function load() {
    const data = await jsonFetch<{ items: JobCardSummary[] }>(`/api/modules/jobcard?mode=${mode}`);
    setItems(data.items);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    setSelected(null);
    setOpening(false);
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load job cards."));
  }, [mode]);

  async function openCard(id: string) {
    setError(null);
    setOpening(false);
    const data = await jsonFetch<{ job: JobCardView }>(`/api/modules/jobcard?mode=${mode}&id=${id}`);
    setSelected(data.job);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await jsonFetch<{ job: JobCardView }>("/api/modules/jobcard", {
        method: "POST",
        body: JSON.stringify({
          mode,
          title: title.trim(),
          machineRef: machineRef.trim() || undefined,
          location: location.trim() || undefined,
          priority,
          description: description.trim(),
          reportedByName: reportedByName.trim(),
          reportedByPhone: reportedByPhone.trim() || undefined,
          openComment: openComment.trim() || undefined,
          ...(signature ? { openSignature: signature } : {}),
          newPhotos: photos.map((dataUrl) => ({ dataUrl, side: "open" })),
        }),
      });
      setTitle("");
      setMachineRef("");
      setLocation("");
      setPriority("normal");
      setDescription("");
      setReportedByName("");
      setReportedByPhone("");
      setOpenComment("");
      setPhotos([]);
      setSignature(null);
      setOpening(false);
      setSelected(data.job);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the job card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Open the card with the fault, a photo, and a comment. The technician completes the other side, and both people sign before it closes.
        </p>
        <Button type="button" onClick={() => {
          setOpening(true);
          setSelected(null);
          setError(null);
          setTitle("");
          setMachineRef("");
          setLocation("");
          setPriority("normal");
          setDescription("");
          setReportedByName("");
          setReportedByPhone("");
          setOpenComment("");
          setPhotos([]);
          setSignature(null);
        }}>Open a job card</Button>
      </div>

      {error && !opening && !selected && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Job cards</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No job cards yet.</p>}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openCard(item.id).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not open that job card."))}
              className={`flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted ${selected?.id === item.id ? "border-primary" : ""}`}
            >
              <span>
                <span className="font-medium">{item.jobNumber} · {item.title}</span>
                <span className="mt-1 block text-muted-foreground">
                  {[item.machineRef, item.reportedByName, item.mechanicName ? `Technician ${item.mechanicName}` : null].filter(Boolean).join(" · ") || "No machine recorded"}
                </span>
              </span>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </CardContent>
      </Card>

      {opening && (
        <Card>
          <CardHeader><CardTitle>Open a {labels.kind.toLowerCase()} job card</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Job title</span><Input value={title} minLength={2} onChange={(event) => setTitle(event.target.value)} required placeholder="Fault or work needed" /></label>
                <label className="block space-y-1.5 text-sm"><span className="font-medium">{labels.asset}</span><Input value={machineRef} onChange={(event) => setMachineRef(event.target.value)} /></label>
                <label className="block space-y-1.5 text-sm"><span className="font-medium">{labels.place}</span><Input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Priority</span>
                  <select className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" value={priority} onChange={(event) => setPriority(event.target.value as JobPriority)}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Reported by</span><Input value={reportedByName} minLength={2} onChange={(event) => setReportedByName(event.target.value)} required /></label>
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Phone</span><Input value={reportedByPhone} onChange={(event) => setReportedByPhone(event.target.value)} /></label>
              </div>
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm"><span className="font-medium">What is wrong</span><textarea className={textareaClass} required minLength={2} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
                <label className="block space-y-1.5 text-sm"><span className="font-medium">Comment</span><textarea className={textareaClass} maxLength={4000} placeholder="What else should the technician know?" value={openComment} onChange={(event) => setOpenComment(event.target.value)} /></label>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Photo</p>
                  <PhotoList value={photos} onChange={setPhotos} max={4} label="Add photo" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Signature of {reportedByName.trim() || "the person opening it"}</p>
                  <SignaturePad key={opening ? "open-pad" : "closed-pad"} onChange={setSignature} height={130} />
                </div>
              </div>
              {error && <p className="text-sm text-destructive lg:col-span-2">{error}</p>}
              <div className="flex flex-wrap gap-2 lg:col-span-2">
                <Button type="submit" disabled={busy}>Open job card</Button>
                <Button type="button" variant="outline" onClick={() => { setOpening(false); setError(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>Back to the list</Button>
            <Button type="button" variant="outline" asChild>
              <a href={`/api/modules/jobcard/${selected.id}/pdf`} target="_blank" rel="noreferrer">Download PDF</a>
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>Print</Button>
          </div>
          {selected.publicToken && origin && (
            <div className="print:hidden">
              <p className="mb-1 text-sm font-medium">Link for the technician or the person signing the other side</p>
              <LinkBox url={`${origin}/p/jobcard/${selected.publicToken}`} />
            </div>
          )}
          <JobCardSheet job={selected} />
          {selected.status !== "done" && (
            <JobCardEditor
              job={selected}
              saveUrl="/api/modules/jobcard"
              method="PATCH"
              extraBody={{ id: selected.id, mode }}
              onSaved={(job) => {
                setSelected(job);
                load().catch(() => undefined);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function JobCardInternalAdmin() {
  return <JobCardAdmin mode="internal" />;
}
export function JobCardFieldAdmin() {
  return <JobCardAdmin mode="field" />;
}
