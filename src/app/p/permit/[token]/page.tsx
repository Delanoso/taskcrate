"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

type Meta = {
  title: string;
  status: string;
  companyName: string;
};

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contractorName: "",
    contractorPhone: "",
    workDetails: "",
    area: "",
    equip: "",
    completion: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");

  async function refresh() {
    const res = await fetch(`/api/modules/permit/public/${token}`);
    const text = await res.text();
    let data: { error?: string; item?: Meta } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      setLoadError("Could not load permit (bad response). Pull to refresh.");
      return;
    }
    if (!res.ok) {
      setLoadError(data.error ?? "Permit not found");
      return;
    }
    if (data.item) setMeta(data.item);
  }

  useEffect(() => {
    refresh().catch(() => setLoadError("Could not load permit"));
  }, [token]);

  // While waiting on the manager, poll so approval unlocks the completion form.
  useEffect(() => {
    if (!meta || (meta.status !== "submitted" && meta.status !== "sent")) return;
    const id = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [meta?.status, token]);

  async function submit(action: "submit" | "complete") {
    setError(null);
    if (action === "submit") {
      if (!form.contractorName.trim()) return setError("Enter contractor name.");
      if (form.contractorPhone.trim().length < 5) return setError("Enter a valid phone number.");
      if (form.workDetails.trim().length < 3) return setError("Describe the work.");
      if (!form.area) return setError("Add a work area photo.");
      if (!form.equip) return setError("Add a safety equipment photo.");
    } else if (!form.completion) {
      return setError("Add a completion photo.");
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/modules/permit/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          contractorName: form.contractorName,
          contractorPhone: form.contractorPhone,
          workDetails: form.workDetails,
          areaPhotoDataUrl: form.area || undefined,
          equipmentPhotoDataUrl: form.equip || undefined,
          completionPhotoDataUrl: form.completion || undefined,
          completionNotes: form.notes || undefined,
        }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError("Server returned an unexpected response. Try again.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Submit failed. Check photos and try again.");
        setLoading(false);
        return;
      }
      setDone(
        action === "submit"
          ? "Submitted for approval — your manager has been notified."
          : "Completion uploaded — manager can close this permit.",
      );
      await refresh();
    } catch {
      setError("Network error. Stay on this page and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Permit unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  if (!meta) return <p className="p-6 text-sm text-muted-foreground">Loading permit…</p>;

  if (done || meta.status === "submitted") {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">{done || "Waiting for manager approval"}</h1>
        <p className="text-sm text-muted-foreground">
          Status: <strong>{meta.status}</strong>. Keep this link — after approval you will upload
          completion photos here.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setDone("");
            refresh();
          }}
        >
          Refresh status
        </Button>
      </div>
    );
  }

  if (meta.status === "completed" || meta.status === "closed") {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">
          {meta.status === "closed" ? "Permit closed" : "Completion received"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{meta.title}</p>
      </div>
    );
  }

  if (meta.status === "approved") {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">{meta.companyName}</p>
        <h1 className="text-xl font-semibold">{meta.title}</h1>
        <p className="rounded-md bg-muted p-3 text-sm">
          Approved — upload completion evidence to finish the job.
        </p>
        <PhotoInput
          label="Completion photo"
          onChange={(u) => setForm({ ...form, completion: u ?? "" })}
        />
        <div className="space-y-2">
          <Label>Completion comments</Label>
          <Input
            placeholder="What was finished / left safe"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={loading} onClick={() => submit("complete")}>
          {loading ? "Uploading…" : "Upload completion"}
        </Button>
      </div>
    );
  }

  // status: sent (or unknown early state)
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{meta.companyName}</p>
      <h1 className="text-xl font-semibold">{meta.title}</h1>
      <div className="space-y-2">
        <Label>Contractor name</Label>
        <Input
          placeholder="Your name / company"
          value={form.contractorName}
          onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          placeholder="WhatsApp number"
          value={form.contractorPhone}
          onChange={(e) => setForm({ ...form, contractorPhone: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Work details</Label>
        <textarea
          className="min-h-24 w-full rounded-md border bg-background p-2 text-sm"
          placeholder="What work will you do, where, and when?"
          value={form.workDetails}
          onChange={(e) => setForm({ ...form, workDetails: e.target.value })}
        />
      </div>
      <PhotoInput label="Work area photo" onChange={(u) => setForm({ ...form, area: u ?? "" })} />
      <PhotoInput
        label="Safety equipment photo"
        onChange={(u) => setForm({ ...form, equip: u ?? "" })}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={loading} onClick={() => submit("submit")}>
        {loading ? "Submitting…" : "Submit for approval"}
      </Button>
    </div>
  );
}
