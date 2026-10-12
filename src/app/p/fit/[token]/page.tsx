"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<any>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [ppe, setPpe] = useState(false);
  const [phase, setPhase] = useState<"idle"|"wait"|"go"|"done">("idle");
  const [start, setStart] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/modules/fit/public/${token}`).then(r => r.json()).then(d => setSite(d.site));
  }, [token]);

  function beginTest() {
    setPhase("wait");
    const delay = 800 + Math.random() * 1500;
    setTimeout(() => { setStart(performance.now()); setPhase("go"); }, delay);
  }

  async function react() {
    if (phase !== "go") return;
    const reactionMs = Math.round(performance.now() - start);
    setPhase("done");
    const res = await fetch(`/api/modules/fit/public/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeName, reactionMs, ppeConfirmed: ppe }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setResult(data.status);
  }

  if (!site) return <p>Loading…</p>;
  if (result) return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-xl font-semibold">{result.replace(/_/g," ")}</h1>{result !== "VERIFIED_READY" && <p className="mt-2 text-sm text-destructive">Foreman has been alerted for a manual check.</p>}</div>;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{site.companyName}</p>
      <h1 className="text-xl font-semibold">Fit-for-duty — {site.name}</h1>
      <Input placeholder="Your name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={ppe} onChange={(e) => setPpe(e.target.checked)} /> Confirm steel-toe boots secure & helmet intact</label>
      {phase === "idle" && <Button className="w-full" disabled={!employeeName} onClick={beginTest}>Start 30s check</Button>}
      {phase === "wait" && <p className="text-center text-sm text-muted-foreground">Wait for GO…</p>}
      {phase === "go" && <Button className="w-full h-24 text-lg" onClick={react}>GO — TAP NOW</Button>}
    </div>
  );
}
