"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";
import { SignaturePad } from "@/components/platform/signature-pad";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<any>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/contract/public/${token}`).then(r => r.json()).then(d => setContract(d.contract));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signature) return alert("Signature required");
    const res = await fetch(`/api/modules/contract/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeName, signatureData: signature }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    if (data.pdfBase64) {
      const a = document.createElement("a");
      a.href = `data:application/pdf;base64,${data.pdfBase64}`;
      a.download = "signed-contract.pdf";
      a.click();
    }
    setDone(true);
  }

  if (!contract) return <p>Loading…</p>;
  if (done) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Signed — PDF downloaded</h1></div>;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{contract.companyName}</p>
      <h1 className="text-xl font-semibold">{contract.title}</h1>
      <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{contract.bodyText}</div>
      <Input placeholder="Full name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required />
      <SignaturePad onChange={setSignature} />
      <Button type="submit" className="w-full">Sign all pages</Button>
    </form>
  );
}
