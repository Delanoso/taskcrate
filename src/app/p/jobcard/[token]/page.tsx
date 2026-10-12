"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [job, setJob] = useState<any>(null);
  const [hoursWorked, setHoursWorked] = useState("");
  const [partsJson, setPartsJson] = useState("[{\"name\":\"filter\",\"qty\":1,\"cost\":120}]");
  const [clientName, setClientName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/jobcard/public/${token}`).then(r => r.json()).then(d => setJob(d.job));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/modules/jobcard/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hoursWorked: hoursWorked ? Number(hoursWorked) : undefined,
        partsJson,
        clientName: clientName || undefined,
        clientSignature: signature || undefined,
        status: signature ? "done" : "in_progress",
      }),
    });
    if (!res.ok) return alert((await res.json()).error);
    setDone(true);
  }

  if (!job) return <p>Loading…</p>;
  if (done) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Job card updated</h1></div>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{job.companyName} · {job.mode}</p>
      <h1 className="text-xl font-semibold">{job.title}</h1>
      <p className="text-sm text-muted-foreground">{job.description}</p>
      <Input type="number" step="0.1" placeholder="Hours worked" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} />
      <textarea className="min-h-20 w-full rounded-md border p-2 text-sm font-mono" value={partsJson} onChange={(e) => setPartsJson(e.target.value)} />
      {job.mode === "field" && (
        <>
          <Input placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <SignaturePad onChange={setSignature} />
        </>
      )}
      <Button type="submit" className="w-full">{job.mode === "field" ? "Capture client sign-off" : "Update job"}</Button>
    </form>
  );
}
