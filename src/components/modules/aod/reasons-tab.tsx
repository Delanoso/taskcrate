"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, jsonFetch } from "@/components/modules/ui-bits";
import type { AodData } from "@/components/modules/aod/types";

export function ReasonsTab({ data, reload }: { data: AodData; reload: () => Promise<unknown> }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"loan" | "deductible">("loan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(body: object) {
    setBusy(true);
    setError(null);
    try {
      await jsonFetch("/api/modules/loan/reasons", { method: "POST", body: JSON.stringify(body) });
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">Your own reasons</h3>
        <p className="text-sm text-muted-foreground">Add reasons your company uses, like &quot;Tool purchase&quot;, &quot;Petrol card used privately&quot; or &quot;Rent deposit&quot;. They show in the reason list on every new AOD.</p>
        {data.canManage ? (
          <div className="space-y-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Reason" maxLength={120} />
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" checked={kind === "loan"} onChange={() => setKind("loan")} />Money owed (loan, purchase, payment)</label>
              <label className="flex items-center gap-1.5"><input type="radio" checked={kind === "deductible"} onChange={() => setKind("deductible")} />Loss or damage</label>
            </div>
            <Button size="sm" disabled={busy || label.trim().length < 3} onClick={async () => { if (await post({ action: "add", label, kind })) setLabel(""); }}><Plus className="size-4" />Add reason</Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ask an owner, admin or manager to add reasons.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ul className="space-y-1.5 text-sm">
          {data.customReasons.length === 0 && <li className="text-muted-foreground">None yet.</li>}
          {data.customReasons.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <span className={r.archived ? "text-muted-foreground line-through" : ""}>{r.label} <span className="text-xs text-muted-foreground">· {r.kind === "deductible" ? "loss / damage" : "money owed"}</span></span>
              {data.canManage && <button type="button" className="text-xs text-primary hover:underline" disabled={busy} onClick={() => post({ action: "archive", id: r.id, archived: !r.archived })}>{r.archived ? "Use again" : "Hide"}</button>}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">Built in</h3>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {data.reasons.map((r) => <li key={r.key} className="text-muted-foreground">{r.label}{r.kind === "deductible" ? " *" : ""}</li>)}
        </ul>
        <p className="text-xs text-muted-foreground">* Loss or damage: the BCEA section 34(2) rules are added to the AOD, and a monthly deduction may not be more than a quarter of pay.</p>
      </section>
    </div>
  );
}
