"use client";

import { useEffect, useState } from "react";
import { PhotoInput } from "@/components/modules/photo-input";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, StatusBadge, jsonFetch } from "@/components/modules/ui-bits";
import { TRAINING_COLUMNS, parseTrainingRows, textToRows, type TrainingImportRow } from "@/lib/modules/training-import";
import { TICKET_TYPES } from "@/lib/modules/training-shared";
import { readXlsx } from "@/lib/xlsx-read";

type Ticket = {
  id: string;
  fullName: string;
  employeeNumber: string | null;
  ticketType: string;
  certificateNumber: string | null;
  provider: string | null;
  issuedOn: string;
  expiresOn: string;
  photoUrl: string | null;
  note: string | null;
  state: "expired" | "due" | "valid";
};

const empty: {
  id: string;
  fullName: string;
  employeeNumber: string;
  ticketType: string;
  otherType: string;
  certificateNumber: string;
  provider: string;
  issuedOn: string;
  expiresOn: string;
  note: string;
} = {
  id: "",
  fullName: "",
  employeeNumber: "",
  ticketType: TICKET_TYPES[0],
  otherType: "",
  certificateNumber: "",
  provider: "",
  issuedOn: "",
  expiresOn: "",
  note: "",
};

export function TrainingAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: TrainingImportRow[]; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setTickets((await jsonFetch<{ tickets: Ticket[] }>("/api/modules/training")).tickets);
  }
  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load"));
  }, []);

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ticketType = form.ticketType === "Other" ? form.otherType.trim() : form.ticketType;
    try {
      await jsonFetch("/api/modules/training", {
        method: "POST",
        body: JSON.stringify({
          id: form.id || undefined,
          fullName: form.fullName,
          employeeNumber: form.employeeNumber,
          ticketType,
          certificateNumber: form.certificateNumber,
          provider: form.provider,
          issuedOn: form.issuedOn,
          expiresOn: form.expiresOn,
          note: form.note,
          photoDataUrl: photo || undefined,
        }),
      });
      setForm(empty);
      setPhoto(null);
      setNotice(form.id ? "Ticket updated." : "Ticket saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the ticket");
    }
  }

  async function onFile(file: File) {
    setError(null);
    try {
      const rows = /\.(csv|txt)$/i.test(file.name) ? textToRows(await file.text()) : await readXlsx(file);
      setPreview(parseTrainingRows(rows));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not read that file");
    }
  }

  const due = tickets.filter((ticket) => ticket.state !== "valid");

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild><a href="/api/modules/training/export">Download Excel</a></Button>
        <Button size="sm" variant="outline" asChild><a href="/api/modules/training/template">Download the template</a></Button>
      </div>
      {due.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Due or expired</CardTitle>
            <CardDescription>These tickets have expired, or they expire in the next 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {due.map((ticket) => (
              <p key={ticket.id} className="text-sm">
                {ticket.fullName} · {ticket.ticketType} · {ticket.expiresOn} · <StatusBadge status={ticket.state} />
                {" · "}
                <button type="button" className="underline" onClick={() => setForm({ ...empty, id: ticket.id, fullName: ticket.fullName, employeeNumber: ticket.employeeNumber ?? "", ticketType: (TICKET_TYPES as readonly string[]).includes(ticket.ticketType) ? ticket.ticketType : "Other", otherType: (TICKET_TYPES as readonly string[]).includes(ticket.ticketType) ? "" : ticket.ticketType, certificateNumber: ticket.certificateNumber ?? "", provider: ticket.provider ?? "", issuedOn: ticket.issuedOn, expiresOn: ticket.expiresOn, note: ticket.note ?? "" })}>Renew</button>
              </p>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Update a ticket" : "Add a ticket"}</CardTitle>
            <CardDescription>Keep the photo of the card, the certificate number, and the expiry.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <Label className="space-y-1 sm:col-span-2">Full name<Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required /></Label>
              <Label className="space-y-1">Employee number<Input value={form.employeeNumber} onChange={(e) => set("employeeNumber", e.target.value)} /></Label>
              <Label className="space-y-1">Ticket
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.ticketType} onChange={(e) => set("ticketType", e.target.value)}>
                  {TICKET_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </Label>
              {form.ticketType === "Other" && (
                <Label className="space-y-1 sm:col-span-2">Ticket name<Input value={form.otherType} onChange={(e) => set("otherType", e.target.value)} required /></Label>
              )}
              <Label className="space-y-1">Certificate number<Input value={form.certificateNumber} onChange={(e) => set("certificateNumber", e.target.value)} /></Label>
              <Label className="space-y-1">Training provider<Input value={form.provider} onChange={(e) => set("provider", e.target.value)} /></Label>
              <Label className="space-y-1">Issued<Input type="date" value={form.issuedOn} onChange={(e) => set("issuedOn", e.target.value)} required /></Label>
              <Label className="space-y-1">Expires<Input type="date" value={form.expiresOn} onChange={(e) => set("expiresOn", e.target.value)} required /></Label>
              <Label className="space-y-1 sm:col-span-2">Note<Input value={form.note} onChange={(e) => set("note", e.target.value)} /></Label>
              <div className="sm:col-span-2"><PhotoInput label={form.id ? "Replace the photo of the card" : "Photo of the card"} onChange={setPhoto} /></div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">{form.id ? "Save ticket" : "Add ticket"}</Button>
                {form.id && <Button type="button" variant="outline" onClick={() => { setForm(empty); setPhoto(null); }}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Load from Excel</CardTitle>
            <CardDescription>
              Columns: {TRAINING_COLUMNS.map((column) => column.label).join(", ")}. A matching person and ticket is updated. Add the photo of the card afterwards. Delete the sample row before you import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed p-4 text-sm">
              Choose an Excel file or CSV
              <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} />
            </label>
            {preview && preview.errors.length > 0 && <ul className="list-disc pl-5 text-xs text-destructive">{preview.errors.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul>}
            {preview && preview.rows.length > 0 && preview.errors.length === 0 && (
              <Button onClick={() => jsonFetch("/api/modules/training", { method: "POST", body: JSON.stringify({ action: "import", rows: preview.rows }) }).then(async (data: { created: number; updated: number }) => { setNotice(`${data.created} added, ${data.updated} updated.`); setPreview(null); await load(); }).catch((err) => setError(err instanceof Error ? err.message : "Import failed"))}>
                Import {preview.rows.length}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>On file</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{ticket.fullName} · {ticket.ticketType}</span>
                <StatusBadge status={ticket.state} />
              </div>
              <p className="text-muted-foreground">Expires {ticket.expiresOn}{ticket.certificateNumber ? ` · ${ticket.certificateNumber}` : ""}{ticket.photoUrl ? "" : " · photo still needed"}</p>
              <div className="mt-2 flex gap-3">
                <button type="button" className="underline" onClick={() => setForm({ ...empty, id: ticket.id, fullName: ticket.fullName, employeeNumber: ticket.employeeNumber ?? "", ticketType: (TICKET_TYPES as readonly string[]).includes(ticket.ticketType) ? ticket.ticketType : "Other", otherType: (TICKET_TYPES as readonly string[]).includes(ticket.ticketType) ? "" : ticket.ticketType, certificateNumber: ticket.certificateNumber ?? "", provider: ticket.provider ?? "", issuedOn: ticket.issuedOn, expiresOn: ticket.expiresOn, note: ticket.note ?? "" })}>Edit</button>
                <a className="underline" href={`/api/modules/training/${ticket.id}/pdf`} target="_blank" rel="noreferrer">Download PDF</a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
