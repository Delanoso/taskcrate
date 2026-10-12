"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [packet, setPacket] = useState<any>(null);
  const [idDoc, setIdDoc] = useState<string | null>(null);
  const [addressDoc, setAddressDoc] = useState<string | null>(null);
  const [bank, setBank] = useState({ bankName: "", accountName: "", accountNumber: "", branchCode: "" });
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/onboard/public/${token}`).then(r => r.json()).then(d => setPacket(d.packet));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idDoc || !addressDoc) return alert("Upload ID and proof of address");
    const res = await fetch(`/api/modules/onboard/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idDocDataUrl: idDoc, addressDocDataUrl: addressDoc, bank }),
    });
    if (!res.ok) return alert((await res.json()).error);
    setDone(true);
  }

  if (!packet) return <p>Loading…</p>;
  if (done) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Documents received</h1></div>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{packet.companyName}</p>
      <h1 className="text-xl font-semibold">Onboarding — {packet.employeeName}</h1>
      <PhotoInput label="ID / Passport" onChange={setIdDoc} />
      <PhotoInput label="Proof of address" onChange={setAddressDoc} />
      <Input placeholder="Bank name" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} required />
      <Input placeholder="Account name" value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} required />
      <Input placeholder="Account number" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} required />
      <Input placeholder="Branch code" value={bank.branchCode} onChange={(e) => setBank({ ...bank, branchCode: e.target.value })} required />
      <Button type="submit" className="w-full">Submit encrypted vault</Button>
    </form>
  );
}
