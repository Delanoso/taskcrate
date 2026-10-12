"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/modules/ui-bits";

type Visit = {
  fullName: string;
  siteName: string;
  companyName: string;
  checkedInAt: string;
  checkedOutAt: string | null;
};

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/visitor/out/${token}`)
      .then(async (r) => (r.ok ? setVisit((await r.json()).visit) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [token]);

  async function checkOut() {
    setBusy(true);
    const res = await fetch(`/api/modules/visitor/out/${token}`, { method: "POST" });
    setBusy(false);
    if (res.ok) setVisit((await res.json()).visit);
  }

  if (missing) return <p className="text-sm text-muted-foreground">This check-out link is not valid.</p>;
  if (!visit) return <p>Loading…</p>;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">{visit.companyName} · {visit.siteName}</p>
      {visit.checkedOutAt ? (
        <>
          <h1 className="text-xl font-semibold">You&apos;re checked out</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for visiting, {visit.fullName}. Checked out {fmt(visit.checkedOutAt)}.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Leaving site?</h1>
          <p className="text-sm text-muted-foreground">
            {visit.fullName}, checked in {fmt(visit.checkedInAt)}.
          </p>
          <Button className="w-full" onClick={checkOut} disabled={busy}>
            {busy ? "Checking out…" : "Check out now"}
          </Button>
        </>
      )}
    </div>
  );
}
