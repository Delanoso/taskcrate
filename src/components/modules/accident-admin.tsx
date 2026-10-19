"use client";

import { useEffect, useState } from "react";
import { PhotoInput } from "@/components/modules/photo-input";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, jsonFetch } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

type Report = {
  id: string;
  reportNumber: string;
  occurredAt: string;
  location: string;
  injuredName: string;
  injury: string;
  reporterName: string;
};

const empty = {
  occurredOn: "",
  occurredTime: "",
  location: "",
  injuredName: "",
  employeeNumber: "",
  idNumber: "",
  jobTitle: "",
  activity: "",
  description: "",
  injury: "",
  treatment: "",
  witnesses: "",
  actionTaken: "",
  reporterName: "",
  witnessName: "",
};

export function AccidentAdmin() {
  const [reports, setReports] = useState<Report[]>([]);
  const [form, setForm] = useState({ ...empty, occurredOn: "" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [extra, setExtra] = useState<string | null>(null);
  const [reporterSignature, setReporterSignature] = useState<string | null>(null);
  const [injuredSignature, setInjuredSignature] = useState<string | null>(null);
  const [witnessSignature, setWitnessSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setReports((await jsonFetch<{ reports: Report[] }>("/api/modules/accident")).reports);
  }
  useEffect(() => {
    setForm((current) => ({ ...current, occurredOn: current.occurredOn || todayIso() }));
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load"));
  }, []);

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo || !reporterSignature) {
      setError("Add a photo and the signature of the person filing this.");
      return;
    }
    setError(null);
    try {
      await jsonFetch("/api/modules/accident", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          photoDataUrl: photo,
          extraPhotoDataUrl: extra || undefined,
          reporterSignature,
          injuredSignature: injuredSignature || undefined,
          witnessSignature: witnessSignature || undefined,
        }),
      });
      setForm({ ...empty, occurredOn: todayIso() });
      setPhoto(null);
      setExtra(null);
      setReporterSignature(null);
      setInjuredSignature(null);
      setWitnessSignature(null);
      setNotice("Report filed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not file the report");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>File a report</CardTitle>
          <CardDescription>The time, the place, what happened, the injury, a photo, and the signature of the person filing it.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          {notice && <p className="mb-3 text-sm text-green-700">{notice}</p>}
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Label className="space-y-1">Date<Input type="date" value={form.occurredOn} onChange={(e) => set("occurredOn", e.target.value)} required /></Label>
            <Label className="space-y-1">Time<Input type="time" value={form.occurredTime} onChange={(e) => set("occurredTime", e.target.value)} required /></Label>
            <Label className="space-y-1 sm:col-span-2">Place<Input value={form.location} onChange={(e) => set("location", e.target.value)} required /></Label>
            <Label className="space-y-1">Injured person<Input value={form.injuredName} onChange={(e) => set("injuredName", e.target.value)} required /></Label>
            <Label className="space-y-1">Employee number<Input value={form.employeeNumber} onChange={(e) => set("employeeNumber", e.target.value)} /></Label>
            <Label className="space-y-1">ID number<Input value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></Label>
            <Label className="space-y-1">Job<Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></Label>
            <Label className="space-y-1 sm:col-span-2">What they were doing<textarea className="min-h-16 w-full rounded-md border p-2 text-sm" value={form.activity} onChange={(e) => set("activity", e.target.value)} required /></Label>
            <Label className="space-y-1 sm:col-span-2">What happened<textarea className="min-h-20 w-full rounded-md border p-2 text-sm" value={form.description} onChange={(e) => set("description", e.target.value)} required /></Label>
            <Label className="space-y-1 sm:col-span-2">Injury and body part<Input value={form.injury} onChange={(e) => set("injury", e.target.value)} required /></Label>
            <Label className="space-y-1 sm:col-span-2">Treatment<Input value={form.treatment} onChange={(e) => set("treatment", e.target.value)} /></Label>
            <Label className="space-y-1 sm:col-span-2">Other people who saw it<Input value={form.witnesses} onChange={(e) => set("witnesses", e.target.value)} /></Label>
            <Label className="space-y-1 sm:col-span-2">Action taken<textarea className="min-h-16 w-full rounded-md border p-2 text-sm" value={form.actionTaken} onChange={(e) => set("actionTaken", e.target.value)} /></Label>
            <div className="sm:col-span-2"><PhotoInput label="Photo" onChange={setPhoto} /></div>
            <div className="sm:col-span-2"><PhotoInput label="Second photo" onChange={setExtra} /></div>
            <Label className="space-y-1 sm:col-span-2">Filed by<Input value={form.reporterName} onChange={(e) => set("reporterName", e.target.value)} required /></Label>
            <div className="sm:col-span-2"><p className="mb-1 text-sm font-medium">Signature of the person filing this</p><SignaturePad onChange={setReporterSignature} /></div>
            <div className="sm:col-span-2"><p className="mb-1 text-sm font-medium">Signature of the injured person</p><SignaturePad onChange={setInjuredSignature} /></div>
            <Label className="space-y-1 sm:col-span-2">Witness who is signing<Input value={form.witnessName} onChange={(e) => set("witnessName", e.target.value)} /></Label>
            <div className="sm:col-span-2"><p className="mb-1 text-sm font-medium">Witness signature</p><SignaturePad onChange={setWitnessSignature} /></div>
            <Button type="submit">File the report</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Each report downloads as a PDF. The list downloads as Excel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" asChild><a href="/api/modules/accident/export">Download Excel</a></Button>
          {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
          {reports.map((report) => (
            <div key={report.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{report.reportNumber} · {report.injuredName}</p>
              <p className="text-muted-foreground">{report.occurredAt.replace("T", " ")} · {report.location}</p>
              <p>{report.injury}</p>
              <p className="text-muted-foreground">Filed by {report.reporterName}</p>
              <a className="underline" href={`/api/modules/accident/${report.id}/pdf`} target="_blank" rel="noreferrer">Download PDF</a>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
