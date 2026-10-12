"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/nearmiss/public/${token}`).then(r => r.json()).then(d => setCompany(d.companyName));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/modules/nearmiss/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, locationHint, photoDataUrl: photo ?? undefined }),
    });
    if (!res.ok) return alert((await res.json()).error);
    setDone(true);
  }

  if (done) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Anonymous report received</h1><p className="text-sm text-muted-foreground mt-2">Thank you — no identity was stored.</p></div>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{company} · anonymous</p>
      <h1 className="text-xl font-semibold">Near-miss / hazard report</h1>
      <textarea className="min-h-28 w-full rounded-md border p-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="What happened / hazard" />
      <Input placeholder="Location hint (optional)" value={locationHint} onChange={(e) => setLocationHint(e.target.value)} />
      <PhotoInput label="Photo" onChange={setPhoto} />
      <Button type="submit" className="w-full">Submit anonymously</Button>
    </form>
  );
}
