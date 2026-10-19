"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Download, FlaskConical, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activePairs, basketTotals } from "@/data/links";
import { getProduct } from "@/data/products";

type App = { slug: string; name: string; category: string; paidUntil: string | null; inGrace: boolean; lapsed: boolean; debitOrderId: string | null };
type Debit = { id: string; apps: string[]; monthly: number; status: string; sandbox: boolean; createdAt: string; lastPaidAt: string | null; cancelledAt: string | null; cancelledBy: string | null; updateCardUrl: string | null };
type Payment = { id: string; invoiceNumber: string; kind: string; sandbox: boolean; apps: string[]; amount: number; period: string; at: string };
type Data = {
  company: string;
  trialEndsAt: string | null;
  trialNote: string | null;
  payments: { live: boolean; sandbox: boolean };
  pricing: { monthly: number; pairMonthly: number; todayPerApp: number; daysLeft: number; daysInMonth: number; billingDate: string };
  openSlugs: string[];
  apps: App[];
  debitOrders: Debit[];
  history: Payment[];
};

const R = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

export function BillingManager({ notice, preselect = [] }: { notice: "paid" | "cancelled" | "card" | null; preselect?: string[] }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(preselect);
  const [busy, setBusy] = useState<string | null>(null);
  const [openedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch("/api/billing");
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error ?? "Could not load billing");
    setData(d);
    return d as Data;
  }, []);

  useEffect(() => {
    let tries = 0;
    let stop = false;
    const tick = async () => {
      const d = await load().catch((e) => { setError(e.message); return null; });
      // The PayFast notification can land a few seconds after the browser comes back.
      if (!stop && notice === "paid" && d && tries++ < 8 && !d.history.some((p) => Date.now() - new Date(p.at).getTime() < 15 * 60_000)) setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; };
  }, [load, notice]);

  const byName = useMemo(() => new Map(data?.apps.map((a) => [a.slug, a.name]) ?? []), [data]);
  if (error) return <p className="mt-6 text-sm text-destructive">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-muted-foreground">Loading billing…</p>;

  const payable = data.apps.filter((a) => !a.debitOrderId);
  const totals = basketTotals(picked, data.openSlugs, data.pricing.daysLeft, data.pricing.daysInMonth);
  const today = totals.today;
  const monthly = totals.monthly;
  const linked = activePairs(picked, data.openSlugs);
  const toggle = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));
  const categories = [...new Set(data.apps.map((a) => a.category))];
  const recentPaid = data.history.some((p) => openedAt - new Date(p.at).getTime() < 15 * 60_000);

  async function pay(sandbox = false) {
    setBusy(sandbox ? "sandbox" : "pay");
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apps: picked, sandbox }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not start the payment");
      document.open();
      document.write(d.payfastHtml);
      document.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the payment");
      setBusy(null);
    }
  }

  async function cancel(d: Debit) {
    const names = d.apps.map((s) => byName.get(s) ?? s).join(", ");
    if (!confirm(`Cancel the monthly debit order for ${names}?\n\nNo further debits will be taken. The apps stay open until the end of the month you have paid for.`)) return;
    setBusy(d.id);
    setError(null);
    try {
      const res = await fetch(`/api/billing/debit/${d.id}`, { method: "DELETE" });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error ?? "Could not cancel");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {notice === "paid" && (
        <Banner tone={recentPaid ? "good" : "info"}>
          {recentPaid ? "Payment received. Your apps are open and the invoice is below." : "Thank you. PayFast is confirming the payment; this page updates by itself in a few seconds."}
        </Banner>
      )}
      {notice === "cancelled" && <Banner tone="info">The payment was cancelled at PayFast. Nothing was charged.</Banner>}
      {notice === "card" && <Banner tone="good">Card details updated at PayFast.</Banner>}
      {data.trialEndsAt && <Banner tone="info">Free trial of every app until {day(data.trialEndsAt)}.{data.trialNote ? ` ${data.trialNote}` : ""} Pay for the apps you want to keep before then.</Banner>}
      {!data.payments.live && <Banner tone="info">Card payments are being switched on. You can choose your apps now; paying opens as soon as PayFast is live.</Banner>}
      {error && <Banner tone="bad">{error}</Banner>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Apps</h2>
        <p className="text-sm text-muted-foreground">
          Tick the apps to pay for. An app on its own is {R(data.pricing.monthly)} a month. Two apps that work together are {R(data.pricing.pairMonthly)} each when both are in this payment, or when you already have the other one open. Today you only pay for the {data.pricing.daysLeft} day{data.pricing.daysLeft === 1 ? "" : "s"} left this month.
        </p>
        {categories.map((cat) => (
          <div key={cat} className="space-y-1.5">
            <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{cat}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.apps.filter((a) => a.category === cat).map((a) => {
                const canPick = !a.debitOrderId;
                return (
                  <label key={a.slug} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${canPick ? "cursor-pointer hover:bg-muted/50" : "bg-muted/30"} ${picked.includes(a.slug) ? "border-primary bg-primary/5" : ""}`}>
                    <input type="checkbox" className="mt-0.5 size-4" disabled={!canPick} checked={picked.includes(a.slug)} onChange={() => toggle(a.slug)} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{a.name}</span>
                      <span className={`block text-xs ${a.lapsed ? "text-destructive" : "text-muted-foreground"}`}>
                        {a.debitOrderId ? `Monthly debit order${a.paidUntil ? ` · paid until ${day(a.paidUntil)}` : ""}${a.inGrace ? " · debit clearing" : ""}`
                          : a.paidUntil ? `Paid until ${day(a.paidUntil)} · no debit order`
                          : a.lapsed ? "Closed - payment not received"
                          : data.trialEndsAt ? "In trial" : "Not rented"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {payable.length > 0 && (
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-lg">
            <div className="text-sm">
              {picked.length ? (
                <>
                  <p><strong>{picked.length} app{picked.length === 1 ? "" : "s"}</strong> · pay <strong>{R(today)}</strong> today</p>
                  <p className="text-muted-foreground">then {R(monthly)} on the 1st of every month · cancel any time</p>
                  {linked.length > 0 && (
                    <p className="text-muted-foreground">
                      {linked.map((pair) => `${getProduct(pair.a)?.name ?? pair.a} + ${getProduct(pair.b)?.name ?? pair.b}`).join("; ")} at {R(data.pricing.pairMonthly)} each.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Tick the apps you want to pay for.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.payments.sandbox && (
                <Button variant="outline" disabled={!picked.length || !!busy} onClick={() => pay(true)} title="PayFast sandbox - no real money">
                  <FlaskConical className="size-4" />{busy === "sandbox" ? "Opening…" : "Test payment"}
                </Button>
              )}
              <Button disabled={!picked.length || !!busy || !data.payments.live} onClick={() => pay(false)}>
                <CreditCard className="size-4" />{busy === "pay" ? "Opening PayFast…" : "Pay with PayFast"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Debit orders</h2>
        {data.debitOrders.length === 0 && <p className="text-sm text-muted-foreground">No debit orders yet. Your first payment sets one up.</p>}
        {data.debitOrders.map((d) => (
          <div key={d.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{R(d.monthly)} a month{d.sandbox ? " · TEST" : ""}</p>
              <p className="text-muted-foreground">{d.apps.map((s) => byName.get(s) ?? s).join(", ")}</p>
              <p className="text-xs text-muted-foreground">
                Started {day(d.createdAt)}{d.lastPaidAt ? ` · last paid ${day(d.lastPaidAt)}` : ""}
                {d.status === "cancelled" ? ` · cancelled ${d.cancelledAt ? day(d.cancelledAt) : ""}${d.cancelledBy ? ` by ${d.cancelledBy}` : ""}` : ""}
              </p>
            </div>
            {d.status === "active" ? (
              <div className="flex flex-wrap gap-2">
                {d.updateCardUrl && <Button size="sm" variant="outline" asChild><a href={d.updateCardUrl}><CreditCard className="size-4" />Update card</a></Button>}
                <Button size="sm" variant="outline" className="text-destructive" disabled={busy === d.id} onClick={() => cancel(d)}>{busy === d.id ? "Cancelling…" : "Cancel"}</Button>
              </div>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Cancelled</span>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payments and invoices</h2>
        {data.history.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
        {data.history.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Invoice</th><th className="px-3 py-2 font-medium">For</th><th className="px-3 py-2 text-right font-medium">Amount</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody>
                {data.history.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{day(p.at)}</td>
                    <td className="px-3 py-2">{p.invoiceNumber}{p.sandbox ? " (test)" : ""}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.period} · {p.apps.length} app{p.apps.length === 1 ? "" : "s"}{p.kind === "first" ? " · first month" : ""}</td>
                    <td className="px-3 py-2 text-right font-medium">{R(p.amount)}</td>
                    <td className="px-3 py-2 text-right"><a className="inline-flex items-center gap-1 text-primary hover:underline" href={`/api/billing/invoice/${p.id}`} target="_blank" rel="noreferrer"><Download className="size-3.5" />PDF</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Banner({ tone, children }: { tone: "good" | "info" | "bad"; children: React.ReactNode }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "bad" ? XCircle : Info;
  const cls = tone === "good" ? "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200" : tone === "bad" ? "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200" : "bg-muted text-foreground";
  return <p className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${cls}`}><Icon className="mt-0.5 size-4 shrink-0" />{children}</p>;
}
