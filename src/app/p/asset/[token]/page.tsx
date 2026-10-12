"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [asset, setAsset] = useState<any>(null);
  const [operatorName, setOperatorName] = useState("");
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [pass, setPass] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/modules/asset/public/${token}`).then(r => r.json()).then(d => {
      setAsset(d.asset);
      setAnswers(d.asset.checklist.map(() => false));
    });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/modules/asset/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorName, answers }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setPass(data.passToken);
  }

  if (!asset) return <p>Loading…</p>;
  if (pass) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">Operational pass unlocked</h1><p className="mt-2 font-mono text-xs break-all">{pass}</p></div>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{asset.companyName}</p>
      <h1 className="text-xl font-semibold">{asset.name}</h1>
      <p className="text-sm">{asset.assetCode}</p>
      <Input placeholder="Operator name" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} required />
      {asset.checklist.map((c: string, i: number) => (
        <label key={c} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={answers[i]} onChange={(e) => {
            const next = [...answers]; next[i] = e.target.checked; setAnswers(next);
          }} />
          {c}
        </label>
      ))}
      <Button type="submit" className="w-full">Unlock shift pass</Button>
    </form>
  );
}
