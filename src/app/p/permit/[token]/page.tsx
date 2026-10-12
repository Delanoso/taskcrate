"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input, Label } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";
import { SignaturePad } from "@/components/platform/signature-pad";
import { PERMIT_HAZARDS, PERMIT_PPE } from "@/lib/modules/permit-options";

type Meta = {
  title: string;
  status: string;
  companyName: string;
  documentNumber?: string | null;
  issuerName?: string | null;
  specificLocation?: string | null;
  startAt?: string | null;
  expiresAt?: string | null;
};

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 py-1 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hazards, setHazards] = useState<string[]>([]);
  const [ppe, setPpe] = useState<string[]>([]);
  const [form, setForm] = useState({
    contractorName: "",
    contractorPhone: "",
    specificLocation: "",
    equipmentId: "",
    workDetails: "",
    loto: false,
    barricades: false,
    extinguisher: false,
    area: "",
    equip: "",
    completion: "",
    notes: "",
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");

  // Functional updates: photo inputs resolve after async compression and must not
  // overwrite fields changed in the meantime.
  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
    if (data.item) {
      const item = data.item;
      setMeta(item);
      setForm((f) => ({ ...f, specificLocation: f.specificLocation || item.specificLocation || "" }));
    }
  }

  useEffect(() => {
    refresh().catch(() => setLoadError("Could not load permit"));
  }, [token]);

  // While waiting on the issuer, poll so approval unlocks the close-out form.
  useEffect(() => {
    if (!meta || (meta.status !== "submitted" && meta.status !== "sent")) return;
    const id = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [meta?.status, token]);

  function toggle(key: string, set: React.Dispatch<React.SetStateAction<string[]>>) {
    set((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));
  }

  async function submit(action: "submit" | "complete") {
    setError(null);
    if (action === "submit") {
      if (form.contractorName.trim().length < 2) return setError("Enter the permit receiver's name.");
      if (form.contractorPhone.trim().length < 5) return setError("Enter a valid phone number.");
      if (form.specificLocation.trim().length < 3) return setError("Enter the specific location.");
      if (!form.equipmentId.trim()) return setError("Enter the equipment tag / asset number.");
      if (form.workDetails.trim().length < 3) return setError("Describe the task.");
      if (hazards.length === 0) return setError("Select at least one hazard.");
      if (!form.loto) return setError("Tick the energy isolation (LOTO) precaution.");
      if (!form.barricades) return setError("Tick the barricades and warning signs precaution.");
      if (!form.extinguisher) return setError("Tick the fire extinguisher precaution.");
      if (!form.area) return setError("Add a work area photo.");
      if (!form.equip) return setError("Add a safety equipment photo.");
      if (!signature) return setError("The receiver must sign before submitting.");
    } else {
      if (!form.completion) return setError("Add a completion photo.");
      if (form.notes.trim().length < 3) return setError("Add close-out notes.");
      if (!signature) return setError("The receiver must sign the close-out.");
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/modules/permit/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "submit"
            ? {
                action,
                contractorName: form.contractorName,
                contractorPhone: form.contractorPhone,
                specificLocation: form.specificLocation,
                equipmentId: form.equipmentId,
                workDetails: form.workDetails,
                hazards,
                lotoConfirmed: form.loto,
                barricadesConfirmed: form.barricades,
                fireExtinguisherOk: form.extinguisher,
                ppe,
                areaPhotoDataUrl: form.area,
                equipmentPhotoDataUrl: form.equip,
                receiverSignatureDataUrl: signature,
              }
            : {
                action,
                completionPhotoDataUrl: form.completion,
                completionNotes: form.notes,
                receiverSignatureDataUrl: signature,
              },
        ),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError("Server returned an unexpected response. Try again.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Submit failed. Check the form and try again.");
        return;
      }
      setSignature(null);
      setDone(
        action === "submit"
          ? "Submitted — waiting for the permit issuer to sign and approve."
          : "Close-out signed — the issuer will countersign and close the permit.",
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

  const header = (
    <div className="space-y-1 border-b pb-4">
      <p className="text-sm text-muted-foreground">{meta.companyName}</p>
      <h1 className="text-xl font-semibold">{meta.title}</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1 text-xs text-muted-foreground">
        {meta.documentNumber && (
          <>
            <dt>Permit no.</dt>
            <dd className="font-medium text-foreground">{meta.documentNumber}</dd>
          </>
        )}
        <dt>Issuer</dt>
        <dd className="text-foreground">{meta.issuerName ?? "—"}</dd>
        <dt>Valid from</dt>
        <dd className="text-foreground">{fmt(meta.startAt)}</dd>
        <dt>Expires</dt>
        <dd className="text-foreground">{fmt(meta.expiresAt)}</dd>
      </dl>
    </div>
  );

  if (done || meta.status === "submitted") {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">{done || "Waiting for issuer approval"}</h1>
        <p className="text-sm text-muted-foreground">
          Status: <strong>{meta.status}</strong>. Keep this link — after approval you will sign the
          close-out here.
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
          {meta.status === "closed" ? "Permit closed" : "Close-out received"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{meta.title}</p>
      </div>
    );
  }

  if (meta.status === "approved") {
    return (
      <div className="space-y-5 rounded-xl border bg-card p-5">
        {header}
        <p className="rounded-md bg-muted p-3 text-sm">
          Approved. When the job is finished, complete the post-work close-out below.
        </p>
        <Section title="Post-work close-out">
          <PhotoInput
            label="Completion photo"
            onChange={(u) => setField("completion", u ?? "")}
          />
          <div className="space-y-2">
            <Label>Close-out notes</Label>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background p-2 text-sm"
              placeholder="What was finished, and anything the issuer should know"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Receiver close-out signature</Label>
            <p className="text-xs text-muted-foreground">
              By signing you confirm tools have been cleared, the area is clean, and the machine
              is safe to power back up.
            </p>
            <SignaturePad onChange={setSignature} />
          </div>
        </Section>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={loading} onClick={() => submit("complete")}>
          {loading ? "Submitting…" : "Sign close-out"}
        </Button>
      </div>
    );
  }

  const expired = meta.expiresAt ? new Date(meta.expiresAt) < new Date() : false;
  if (expired) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6">
        {header}
        <p className="text-sm text-destructive">
          This permit has expired. Ask the issuer to send a new permit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border bg-card p-5">
      {header}

      <Section title="Who is doing the work">
        <div className="space-y-2">
          <Label>Permit receiver</Label>
          <Input
            placeholder="Supervisor / contractor managing the tools"
            value={form.contractorName}
            onChange={(e) => setField("contractorName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone (WhatsApp)</Label>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="Mobile number"
            value={form.contractorPhone}
            onChange={(e) => setField("contractorPhone", e.target.value)}
          />
        </div>
      </Section>

      <Section title="Location & job scope">
        <div className="space-y-2">
          <Label>Specific location</Label>
          <Input
            placeholder="e.g. Warehouse B, Grid Line 4"
            value={form.specificLocation}
            onChange={(e) => setField("specificLocation", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Equipment ID</Label>
          <Input
            placeholder="Equipment tag, asset number or machine name"
            value={form.equipmentId}
            onChange={(e) => setField("equipmentId", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Task description</Label>
          <textarea
            className="min-h-20 w-full rounded-md border bg-background p-2 text-sm"
            placeholder="e.g. Replacing overhead motor belts"
            value={form.workDetails}
            onChange={(e) => setField("workDetails", e.target.value)}
          />
        </div>
      </Section>

      <Section title="Hazard identification">
        <p className="text-xs text-muted-foreground">Tick every hazard present at this job.</p>
        <div className="grid rounded-md border px-3 py-2 sm:grid-cols-2 sm:gap-x-4">
          {PERMIT_HAZARDS.map((h) => (
            <CheckRow
              key={h.key}
              label={h.label}
              checked={hazards.includes(h.key)}
              onChange={() => toggle(h.key, setHazards)}
            />
          ))}
        </div>
      </Section>

      <Section title="Precautions & risk controls">
        <div className="rounded-md border px-3 py-2">
          <CheckRow
            label="Energy isolation: power, valves or physical locks engaged (LOTO)"
            checked={form.loto}
            onChange={(v) => setField("loto", v)}
          />
          <CheckRow
            label="Area barricades and warning signs in place"
            checked={form.barricades}
            onChange={(v) => setField("barricades", v)}
          />
          <CheckRow
            label="Fire extinguisher on standby"
            checked={form.extinguisher}
            onChange={(v) => setField("extinguisher", v)}
          />
        </div>
        <div className="space-y-2">
          <Label>Mandatory PPE</Label>
          <div className="grid rounded-md border px-3 py-2 sm:grid-cols-2 sm:gap-x-4">
            {PERMIT_PPE.map((p) => (
              <CheckRow
                key={p.key}
                label={p.label}
                checked={ppe.includes(p.key)}
                onChange={() => toggle(p.key, setPpe)}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Photo evidence">
        <PhotoInput label="Work area photo" onChange={(u) => setField("area", u ?? "")} />
        <PhotoInput
          label="Safety equipment photo"
          onChange={(u) => setField("equip", u ?? "")}
        />
      </Section>

      <Section title="Pre-work sign-off">
        <p className="text-xs text-muted-foreground">
          Sign after verifying conditions on the ground. The issuer countersigns when approving.
        </p>
        <SignaturePad onChange={setSignature} />
      </Section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={loading} onClick={() => submit("submit")}>
        {loading ? "Submitting…" : "Sign & submit for approval"}
      </Button>
    </div>
  );
}
