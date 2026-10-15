"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StockMoveForm, type StockMovePayload } from "@/components/modules/stock-move-form";
import { StockRegister } from "@/components/modules/stock-register";
import { Button } from "@/components/modules/ui-bits";
import { partyLabels, type StockItemView } from "@/lib/modules/stock-shared";

export default function Page() {
  const { token } = useParams<{ token: string }>();
  const [item, setItem] = useState<StockItemView | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [kind, setKind] = useState<"issue" | "return">("issue");
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/stock/public/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setMissing(true);
          return;
        }
        setItem(data.item);
        setCompanyName(data.companyName ?? "");
      })
      .catch(() => setMissing(true));
  }, [token]);

  async function save(payload: StockMovePayload) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/stock/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that entry.");
      setItem(data.item);
      setFormKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that entry.");
    } finally {
      setBusy(false);
    }
  }

  if (missing) return <p className="text-sm">This stock item could not be found.</p>;
  if (!item) return <p className="text-sm text-muted-foreground">Loading stock…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{companyName}</p>
        <h1 className="text-xl font-semibold">{item.name}</h1>
        <p className="mt-1 text-sm">{item.quantity} {item.unit} on hand{item.location ? ` · ${item.location}` : ""}</p>
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex gap-2">
          {(["issue", "return"] as const).map((option) => (
            <Button key={option} type="button" size="sm" variant={option === kind ? "default" : "outline"} onClick={() => { setKind(option); setError(null); setFormKey((value) => value + 1); }}>
              {partyLabels(option).title}
            </Button>
          ))}
        </div>
        {kind === "issue" && item.quantity < 1 ? (
          <p className="text-sm text-muted-foreground">Nothing on hand to sign out.</p>
        ) : (
          <StockMoveForm key={`${kind}-${formKey}`} kind={kind} unit={item.unit} loggerName="" busy={busy} onSubmit={save} />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Recent register</h2>
        <StockRegister movements={item.movements} unit={item.unit} />
      </div>
    </div>
  );
}
