"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [record, setRecord] = useState<any>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/loan/public/${token}`).then(r => r.json()).then(d => setRecord(d.record));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signature) return alert("Signature required");
    const res = await fetch(`/api/modules/loan/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureData: signature }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    if (data.pdfBase64) {
      const a = document.createElement("a");
      a.href = `data:application/pdf;base64,${data.pdfBase64}`;
      a.download = `${data.documentNumber}.pdf`;
      a.click();
    }
    setDone(true);
  }

  if (!record) return <p>Loading…</p>;
  if (done) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Signed</h1></div>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{record.companyName}</p>
      <h1 className="text-xl font-semibold">{record.recordType === "loan" ? "Acknowledgment of Debt" : "Incident Deductible"}</h1>
      <p className="text-sm">{record.employeeName} · Amount {record.amount}</p>
      <p className="text-sm text-muted-foreground">{record.description}</p>
      <SignaturePad onChange={setSignature} />
      <Button type="submit" className="w-full">Sign consent</Button>
    </form>
  );
}
