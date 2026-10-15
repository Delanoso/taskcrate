"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Input } from "@/components/modules/ui-bits";
import { PhotoInput } from "@/components/modules/photo-input";
import { SignaturePad } from "@/components/platform/signature-pad";

type Site = { name: string; companyName: string; bubbles: number; lifeMs: number; ppe: { key: string; label: string }[] };
type Bubble = { index: number; x: number; y: number };

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [missing, setMissing] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [ppeAnswers, setPpeAnswers] = useState<Record<string, boolean>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "play" | "done">("form");
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [popped, setPopped] = useState(0);
  const [missed, setMissed] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timers = useRef<number[]>([]);
  const pops = useRef<(number | null)[]>([]);
  const alive = useRef<number | null>(null);
  const born = useRef(0);
  const sent = useRef(false);
  const siteRef = useRef<Site | null>(null);
  const nameRef = useRef("");
  const packRef = useRef<{ employeeNumber: string; ppe: { key: string; pass: boolean }[]; photo: string; signature: string } | null>(null);

  useEffect(() => {
    fetch(`/api/modules/fit/public/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        siteRef.current = d.site;
        setSite(d.site);
      })
      .catch(() => setMissing(true));
    return () => timers.current.forEach((t) => clearTimeout(t));
  }, [token]);

  function later(fn: () => void, ms: number) {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
  }

  function arm(index: number) {
    const rules = siteRef.current;
    if (!rules) return;
    if (index >= rules.bubbles) {
      void finish();
      return;
    }
    const gap = 450 + Math.random() * 1100;
    later(() => show(index), gap);
  }

  function show(index: number) {
    const rules = siteRef.current;
    if (!rules) return;
    born.current = performance.now();
    alive.current = index;
    setBubble({
      index,
      x: 14 + Math.random() * 72,
      y: 16 + Math.random() * 68,
    });
    later(() => {
      if (alive.current !== index) return;
      alive.current = null;
      pops.current[index] = null;
      setMissed((n) => n + 1);
      setBubble(null);
      arm(index + 1);
    }, rules.lifeMs);
  }

  function popBubble() {
    const rules = siteRef.current;
    const index = alive.current;
    if (!rules || index == null) return;
    alive.current = null;
    const reaction = Math.max(1, Math.min(rules.lifeMs, Math.round(performance.now() - born.current)));
    pops.current[index] = reaction;
    setPopped((n) => n + 1);
    setBubble(null);
    arm(index + 1);
  }

  function start() {
    const rules = siteRef.current;
    if (!rules || employeeName.trim().length < 2) return;
    if (rules.ppe.some((item) => typeof ppeAnswers[item.key] !== "boolean")) {
      setError("Answer every PPE check.");
      return;
    }
    if (!photo) {
      setError("Add a photo.");
      return;
    }
    if (!signature) {
      setError("Sign to confirm you are fit to start.");
      return;
    }
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    pops.current = [];
    alive.current = null;
    sent.current = false;
    nameRef.current = employeeName.trim();
    packRef.current = {
      employeeNumber: employeeNumber.trim(),
      ppe: rules.ppe.map((item) => ({ key: item.key, pass: ppeAnswers[item.key] })),
      photo,
      signature,
    };
    setPopped(0);
    setMissed(0);
    setError(null);
    setBubble(null);
    setPhase("play");
    arm(0);
  }

  async function finish() {
    const rules = siteRef.current;
    if (!rules || sent.current) return;
    sent.current = true;
    setBubble(null);
    const res = await fetch(`/api/modules/fit/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeName: nameRef.current,
        employeeNumber: packRef.current?.employeeNumber || undefined,
        ppe: packRef.current?.ppe ?? [],
        photo: packRef.current?.photo,
        signature: packRef.current?.signature,
        pops: Array.from({ length: rules.bubbles }, (_, i) => ({ reactionMs: pops.current[i] ?? null })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      sent.current = false;
      setPhase("form");
      setError(data.error ?? "Could not save the check. Please try again.");
      return;
    }
    setResult(data.status);
    setPhase("done");
  }

  if (missing) return <p className="text-sm text-muted-foreground">This gate link is no longer valid.</p>;
  if (!site) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (phase === "done" && result) {
    const ready = result === "VERIFIED_READY";
    return (
      <div className={`rounded-xl border bg-card p-6 text-center ${ready ? "" : "border-destructive/40"}`}>
        <h1 className="text-xl font-semibold">{ready ? "Verified ready" : "Not cleared"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready ? "You can start the shift." : "Foreman has been alerted for a manual check."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <style>{`@keyframes fit-bubble { 0% { transform: translate(-50%, -50%) scale(0.3); } 12% { transform: translate(-50%, -50%) scale(1); } 100% { transform: translate(-50%, -50%) scale(0.7); } }`}</style>
      <p className="text-sm text-muted-foreground">{site.companyName}</p>
      <h1 className="text-xl font-semibold">Fit-for-duty — {site.name}</h1>

      {phase === "form" && (
        <>
          <p className="text-sm text-muted-foreground">
            {site.bubbles} bubbles will appear, one at a time, in different places. Tap each one before it disappears.
          </p>
          <Input placeholder="Your name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
          <Input placeholder="Employee number" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
          <div className="space-y-2">
            {site.ppe.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-2 text-sm">
                <span>{item.label}</span>
                <span className="flex gap-1">
                  <Button type="button" size="sm" variant={ppeAnswers[item.key] === true ? "default" : "outline"} onClick={() => setPpeAnswers((current) => ({ ...current, [item.key]: true }))}>Pass</Button>
                  <Button type="button" size="sm" variant={ppeAnswers[item.key] === false ? "default" : "outline"} onClick={() => setPpeAnswers((current) => ({ ...current, [item.key]: false }))}>Fail</Button>
                </span>
              </div>
            ))}
          </div>
          <PhotoInput label="Photo" onChange={setPhoto} />
          <div>
            <p className="mb-1 text-sm font-medium">Signature</p>
            <p className="mb-2 text-xs text-muted-foreground">Sign to confirm you are fit to start this shift. The time is saved with this signature.</p>
            <SignaturePad onChange={setSignature} />
          </div>
          <Button className="w-full" disabled={employeeName.trim().length < 2} onClick={start}>
            Start check
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}

      {phase === "play" && (
        <>
          <p className="text-sm text-muted-foreground">
            Popped {popped} · Missed {missed} · {popped + missed} of {site.bubbles}
          </p>
          <div className="relative h-80 overflow-hidden rounded-lg bg-muted/60 touch-manipulation sm:h-96">
            {!bubble && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Watch for the next bubble…</p>}
            {bubble && (
              <button
                type="button"
                aria-label="Pop the bubble"
                onClick={popBubble}
                className="absolute grid size-20 place-items-center rounded-full bg-sky-500 text-sm font-semibold text-white shadow-lg"
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  animation: `fit-bubble ${site.lifeMs}ms linear forwards`,
                }}
              >
                Pop
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
