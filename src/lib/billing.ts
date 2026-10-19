import { getProduct } from "@/data/products";
import { db } from "@/lib/db";
import { sendAlertEmail } from "@/lib/mail";
import { monthQuote } from "@/lib/pricing";

/** The debit on the 1st can clear days later; apps stay open meanwhile. */
export const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function rentIsOpen(sub: { status: string; currentPeriodEnd: Date | null }) {
  return sub.status === "active" && sub.currentPeriodEnd != null && sub.currentPeriodEnd.getTime() + GRACE_MS > Date.now();
}

export function openRentWhere(organizationId: string, productSlug?: string) {
  return {
    organizationId,
    ...(productSlug ? { productSlug } : {}),
    status: "active",
    currentPeriodEnd: { gt: new Date(Date.now() - GRACE_MS) },
  };
}

export async function companyHasApp(organizationId: string, productSlug: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { trialEndsAt: true },
  });
  if (org?.trialEndsAt && org.trialEndsAt.getTime() > Date.now()) return true;
  return !!(await db.subscription.findFirst({ where: openRentWhere(organizationId, productSlug) }));
}

export function formatRentDate(date: Date) {
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export async function grantPaidPeriod(input: {
  organizationId: string;
  productSlug: string;
  provider?: string;
  paymentRef?: string;
  payfastToken?: string;
}) {
  const existing = await db.subscription.findUnique({
    where: {
      organizationId_productSlug: {
        organizationId: input.organizationId,
        productSlug: input.productSlug,
      },
    },
  });
  const periodEnd = monthQuote().periodEnd;
  const currentPeriodEnd =
    existing?.currentPeriodEnd && existing.currentPeriodEnd > periodEnd ? existing.currentPeriodEnd : periodEnd;
  await db.subscription.upsert({
    where: {
      organizationId_productSlug: {
        organizationId: input.organizationId,
        productSlug: input.productSlug,
      },
    },
    create: {
      organizationId: input.organizationId,
      productSlug: input.productSlug,
      status: "active",
      currentPeriodEnd,
      provider: input.provider,
      stripeSubscriptionId: input.paymentRef,
      payfastToken: input.payfastToken,
    },
    update: {
      status: "active",
      currentPeriodEnd,
      provider: input.provider,
      ...(input.paymentRef ? { stripeSubscriptionId: input.paymentRef } : {}),
      ...(input.payfastToken ? { payfastToken: input.payfastToken } : {}),
    },
  });
  return currentPeriodEnd;
}

export async function extendRentByPaymentRef(paymentRef: string) {
  const sub = await db.subscription.findFirst({ where: { stripeSubscriptionId: paymentRef } });
  if (!sub) return;
  await grantPaidPeriod({
    organizationId: sub.organizationId,
    productSlug: sub.productSlug,
    provider: sub.provider ?? "stripe",
    paymentRef,
  });
}

export async function stopRentByEmail(input: {
  email: string;
  productSlug: string;
  status: "past_due" | "canceled";
  reason: string;
}) {
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const organizationId = user?.memberships[0]?.organizationId;
  if (!organizationId) return false;
  return stopRent({
    organizationId,
    productSlug: input.productSlug,
    status: input.status,
    reason: input.reason,
  });
}

export async function stopRentByPaymentRef(
  paymentRef: string,
  status: "past_due" | "canceled",
  reason: string,
) {
  const sub = await db.subscription.findFirst({ where: { stripeSubscriptionId: paymentRef } });
  if (!sub) return false;
  return stopRent({
    organizationId: sub.organizationId,
    productSlug: sub.productSlug,
    status,
    reason,
  });
}

async function stopRent(input: {
  organizationId: string;
  productSlug: string;
  status: "past_due" | "canceled";
  reason: string;
}) {
  const sub = await db.subscription.findUnique({
    where: {
      organizationId_productSlug: {
        organizationId: input.organizationId,
        productSlug: input.productSlug,
      },
    },
    include: { organization: true },
  });
  if (!sub || sub.status === input.status || sub.status === "canceled") return false;
  await db.subscription.update({ where: { id: sub.id }, data: { status: input.status } });
  await notifyStopped([
    {
      company: sub.organization.name,
      productSlug: sub.productSlug,
      reason: input.reason,
    },
  ]);
  return true;
}

/** Closes rents whose paid month has ended, or that were opened with no payment at all. */
export async function expireUnpaidSubscriptions(organizationId?: string) {
  const now = new Date();
  const due = await db.subscription.findMany({
    where: {
      status: "active",
      ...(organizationId ? { organizationId } : {}),
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { lte: new Date(now.getTime() - GRACE_MS) } }],
    },
    include: { organization: true },
  });
  if (due.length === 0) return;
  await db.subscription.updateMany({
    where: { id: { in: due.map((row) => row.id) } },
    data: { status: "past_due" },
  });
  await notifyStopped(
    due.map((row) => ({
      company: row.organization.name,
      productSlug: row.productSlug,
      reason: row.currentPeriodEnd
        ? `the paid month ended on ${formatRentDate(row.currentPeriodEnd)}`
        : "no payment is on record",
    })),
  );
}

async function notifyStopped(rows: Array<{ company: string; productSlug: string; reason: string }>) {
  if (rows.length === 0) return;
  const lines = rows.map((row) => {
    const name = getProduct(row.productSlug)?.name ?? row.productSlug;
    return `- ${row.company}: ${name} — ${row.reason}`;
  });
  await sendAlertEmail({
    subject: "[TaskCrate] App access switched off",
    text: ["These rents were switched off because payment was not received.", "", ...lines].join("\n"),
  });
}
