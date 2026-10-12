"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<any>(null);
  const [docType, setDocType] = useState("coida");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await (await fetch(`/api/modules/contractor/public/${token}`)).json();
    setInfo(d.contractor);
  }
  useEffect(() => { load(); }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert("Upload required");
    const res = await fetch(`/api/modules/contractor/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, fileDataUrl: file, expiresAt: expiresAt || undefined }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setMsg("Uploaded");
    load();
  }

  if (!info) return <p>Loading…</p>;
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{info.hostCompany}</p>
      <h1 className="text-xl font-semibold">{info.companyName}</h1>
      <p className="text-sm">Status: {info.status}</p>
      <ul className="text-xs text-muted-foreground">{info.documents?.map((d: any) => <li key={d.id}>{d.docType} · expires {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "n/a"}</li>)}</ul>
      <form onSubmit={submit} className="space-y-3">
        <select className="h-9 w-full rounded-md border px-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="coida">Letter of Good Standing (COIDA)</option>
          <option value="liability">Public liability</option>
          <option value="medical">Worker medicals</option>
        </select>
        <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        <PhotoInput label="Document image / scan" onChange={setFile} />
        <Button type="submit" className="w-full">Upload</Button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </div>
  );
}
