import { NextResponse } from "next/server";
import { APP_PAIRS, PAIR_ZAR } from "@/data/links";
import { PRODUCTS, RENT_ZAR } from "@/data/products";
import { GRACE_MS, rentIsOpen } from "@/lib/billing";
import { requireBillingApi } from "@/lib/billing-guard";
import { db } from "@/lib/db";
import { jsonList } from "@/lib/modules/common";
import { payfastConfig, payfastReady, updateCardUrl } from "@/lib/payfast";
import { appOrigin, basketQuote } from "@/lib/payments";

export async function GET() {
  const gate = await requireBillingApi();
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const [org, subs, debits, payments] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId }, select: { name: true, trialEndsAt: true, trialNote: true } }),
    db.subscription.findMany({ where: { organizationId: orgId } }),
    db.debitOrder.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
    db.billingPayment.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  const debitFor = new Map<string, (typeof debits)[number]>();
  for (const d of debits) if (d.status === "active") for (const s of jsonList(d.appsJson)) debitFor.set(s, d);
  const subFor = new Map(subs.map((s) => [s.productSlug, s]));
  const now = Date.now();
  const trialOpen = !!(org?.trialEndsAt && org.trialEndsAt.getTime() > now);
  const quote = basketQuote(["x"]);

  return NextResponse.json({
    company: org?.name ?? "",
    trialEndsAt: trialOpen ? org!.trialEndsAt!.toISOString() : null,
    trialNote: org?.trialNote ?? null,
    payments: { live: payfastReady(payfastConfig(false)), sandbox: gate.platformAdmin },
    pricing: {
      monthly: RENT_ZAR,
      pairMonthly: PAIR_ZAR,
      todayPerApp: quote.today,
      daysLeft: quote.daysLeft,
      daysInMonth: quote.daysInMonth,
      billingDate: quote.billingDate,
      pairs: APP_PAIRS,
    },
    openSlugs: PRODUCTS.map((p) => p.slug).filter((slug) => {
      const sub = subFor.get(slug);
      return !!sub && rentIsOpen(sub);
    }),
    apps: PRODUCTS.map((p) => {
      const s = subFor.get(p.slug);
      const open = !!s && rentIsOpen(s);
      const debit = debitFor.get(p.slug);
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        paidUntil: open && s?.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
        inGrace: open && !!s?.currentPeriodEnd && s.currentPeriodEnd.getTime() < now && s.currentPeriodEnd.getTime() + GRACE_MS > now,
        lapsed: !!s && !open,
        debitOrderId: debit?.id ?? null,
      };
    }),
    debitOrders: debits.map((d) => ({
      id: d.id,
      apps: jsonList(d.appsJson),
      monthly: d.recurringAmount,
      status: d.status,
      sandbox: d.sandbox,
      createdAt: d.createdAt.toISOString(),
      lastPaidAt: d.lastPaidAt?.toISOString() ?? null,
      cancelledAt: d.cancelledAt?.toISOString() ?? null,
      cancelledBy: d.cancelledBy,
      updateCardUrl: d.status === "active" ? updateCardUrl(payfastConfig(d.sandbox), d.token, `${appOrigin()}/dashboard/billing?card=1`) : null,
    })),
    history: payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      kind: p.kind,
      sandbox: p.sandbox,
      apps: jsonList(p.appsJson),
      amount: p.amountGross,
      period: p.periodLabel,
      at: p.createdAt.toISOString(),
    })),
  });
}
