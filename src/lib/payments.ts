import { randomBytes } from "crypto";
import type { PaymentIntent } from "@/generated/prisma/client";
import { RENT_ZAR, getProduct } from "@/data/products";
import { grantPaidPeriod } from "@/lib/billing";
import { db } from "@/lib/db";
import { alertCompany } from "@/lib/email";
import { jsonList } from "@/lib/modules/common";
import { sendAlertEmail } from "@/lib/mail";
import { requestPasswordReset } from "@/lib/password-reset";
import { checkoutFormHtml, confirmWithPayfast, itnParamString, itnSignature, payfastApi, payfastConfig, payfastReady } from "@/lib/payfast";
import { johannesburgDate, monthQuote } from "@/lib/pricing";
import { provisionWorkspaceFromPayment } from "@/lib/provision";

export const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL || "https://taskcrate.co.za").replace(/\/$/, "");
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Today's pro-rata charge and the monthly debit for a basket of apps. */
export function basketQuote(slugs: string[], now = new Date()) {
  const q = monthQuote(now);
  return { ...q, apps: slugs.length, today: round2(q.amount * slugs.length), monthly: RENT_ZAR * slugs.length };
}

export function validApps(slugs: string[]) {
  const unique = [...new Set(slugs)];
  const bad = unique.filter((s) => !getProduct(s));
  return { apps: unique.filter((s) => getProduct(s)), bad };
}

export async function createCheckout(input: {
  organizationId: string | null;
  apps: string[];
  email: string;
  fullName: string;
  companyName: string;
  createdBy?: string;
  sandbox?: boolean;
}) {
  const cfg = payfastConfig(!!input.sandbox);
  if (!payfastReady(cfg)) return { error: "Card payments are not switched on yet. Please try again later or contact support." } as const;
  const quote = basketQuote(input.apps);
  if (quote.today < 5) return { error: "PayFast needs a payment of at least R5." } as const;

  const intent = await db.paymentIntent.create({
    data: {
      organizationId: input.organizationId,
      reference: `TC${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`,
      sandbox: cfg.sandbox,
      appsJson: JSON.stringify(input.apps),
      amount: quote.today,
      recurringAmount: quote.monthly,
      email: input.email.toLowerCase().trim(),
      fullName: input.fullName,
      companyName: input.companyName,
      createdBy: input.createdBy ?? null,
    },
  });
  const names = input.apps.map((s) => getProduct(s)?.name ?? s);
  const [first, ...rest] = input.fullName.trim().split(/\s+/);
  const base = appOrigin();
  const back = input.organizationId ? `${base}/dashboard/billing` : `${base}/checkout/success`;
  const fields: [string, string][] = [
    ["merchant_id", cfg.merchantId],
    ["merchant_key", cfg.merchantKey],
    ["return_url", `${back}?paid=${intent.reference}`],
    ["cancel_url", input.organizationId ? `${base}/dashboard/billing?cancelled=1` : `${base}/products`],
    ["notify_url", `${base}/api/webhooks/payfast`],
    ["name_first", first ?? input.fullName],
    ["name_last", rest.join(" ") || first || "Customer"],
    ["email_address", intent.email],
    ["m_payment_id", intent.reference],
    ["amount", quote.today.toFixed(2)],
    ["item_name", `TaskCrate - ${input.apps.length} app${input.apps.length === 1 ? "" : "s"}`],
    ["item_description", names.join(", ").slice(0, 255)],
    ["custom_str1", intent.id],
    ["subscription_type", "1"],
    ["billing_date", quote.billingDate],
    ["recurring_amount", quote.monthly.toFixed(2)],
    ["frequency", "3"],
    ["cycles", "0"],
  ];
  return { intent, html: checkoutFormHtml(cfg, fields), quote } as const;
}

function periodLabel(now = new Date()) {
  const { year, month } = johannesburgDate(now);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

type ItnResult = { status: number; body: string; note?: string };

/** Processes a PayFast ITN. Every check must pass before anything opens. */
export async function handlePayfastItn(form: FormData): Promise<ItnResult> {
  const entries: [string, string][] = [];
  for (const [k, v] of form.entries()) {
    if (k === "signature") break;
    entries.push([k, String(v)]);
  }
  const get = (k: string) => String(form.get(k) ?? "");
  const intent = await findIntent(get("custom_str1"), get("m_payment_id"), get("token"));
  if (!intent) return { status: 200, body: "ignored", note: "unknown payment" };

  const cfg = payfastConfig(intent.sandbox);
  if (get("signature") !== itnSignature(entries, cfg.passphrase)) return { status: 400, body: "bad signature", note: "signature" };
  if (get("merchant_id") !== cfg.merchantId) return { status: 200, body: "ignored", note: "merchant" };
  let valid = false;
  try {
    valid = await confirmWithPayfast(cfg, itnParamString(entries));
  } catch {
    return { status: 503, body: "retry", note: "validate unreachable" };
  }
  if (!valid) return { status: 200, body: "ignored", note: "not valid at PayFast" };

  const status = get("payment_status");
  const token = get("token") || intent.payfastToken || "";
  const apps = jsonList(intent.appsJson);

  if (status === "CANCELLED") {
    if (token) {
      await db.debitOrder.updateMany({ where: { token, status: "active" }, data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: "PayFast" } });
    }
    return { status: 200, body: "OK", note: "cancelled" };
  }
  if (status !== "COMPLETE") return { status: 200, body: "ignored", note: status };

  const providerRef = get("pf_payment_id");
  if (!providerRef) return { status: 400, body: "missing pf_payment_id" };
  if (await db.billingPayment.findUnique({ where: { providerRef } })) return { status: 200, body: "OK", note: "duplicate" };

  const gross = Number(get("amount_gross"));
  const first = intent.status === "pending";
  const expected = first ? intent.amount : intent.recurringAmount;
  if (!Number.isFinite(gross) || Math.abs(gross - expected) > 0.01) {
    await sendAlertEmail({ subject: "[TaskCrate] PayFast amount mismatch", text: `${intent.reference}: expected R${expected.toFixed(2)}, got R${get("amount_gross")}` });
    return { status: 200, body: "ignored", note: "amount" };
  }

  let organizationId = intent.organizationId;
  if (!organizationId) {
    const result = await provisionWorkspaceFromPayment({
      email: intent.email,
      fullName: intent.fullName,
      companyName: intent.companyName,
      productSlug: apps[0],
      provider: "payfast",
      paymentRef: providerRef,
      payfastToken: token || undefined,
    });
    organizationId = result.organizationId;
    if (result.temporaryPassword) await requestPasswordReset(intent.email, appOrigin()).catch(() => undefined);
  }
  for (const slug of apps) await grantPaidPeriod({ organizationId, productSlug: slug, provider: "payfast", paymentRef: providerRef, payfastToken: token || undefined });

  const now = new Date();
  if (first) await db.paymentIntent.update({ where: { id: intent.id }, data: { status: "paid", paidAt: now, organizationId, payfastToken: token || null } });
  if (token) {
    await db.debitOrder.upsert({
      where: { token },
      create: { organizationId, token, intentId: intent.id, sandbox: intent.sandbox, appsJson: intent.appsJson, recurringAmount: intent.recurringAmount, lastPaidAt: now },
      update: { lastPaidAt: now },
    });
  }
  const fee = Number(get("amount_fee"));
  const net = Number(get("amount_net"));
  await db.billingPayment.create({
    data: {
      organizationId,
      providerRef,
      intentId: intent.id,
      token: token || null,
      kind: first ? "first" : "recurring",
      sandbox: intent.sandbox,
      appsJson: intent.appsJson,
      amountGross: gross,
      amountFee: Number.isFinite(fee) ? fee : null,
      amountNet: Number.isFinite(net) ? net : null,
      invoiceNumber: `TC-INV-${providerRef}`,
      periodLabel: periodLabel(now),
    },
  });
  const paidBody = `${apps.length} app${apps.length === 1 ? "" : "s"} paid for ${periodLabel(now)}. The invoice is on the Billing page.`;
  await alertCompany(organizationId, {
    productSlug: "billing",
    title: `Payment received: R ${gross.toFixed(2)}`,
    body: paidBody,
    kind: "payment_received",
    subject: `Payment received: R ${gross.toFixed(2)}`,
    lines: [paidBody],
  });
  if (!intent.sandbox) {
    await sendAlertEmail({
      subject: `[TaskCrate] Payment R${gross.toFixed(2)} from ${intent.companyName}`,
      text: `${first ? "First payment" : "Monthly debit"} ${providerRef}\n${apps.map((s) => getProduct(s)?.name ?? s).join("\n")}`,
    }).catch(() => undefined);
  }
  return { status: 200, body: "OK", note: first ? "first" : "recurring" };
}

async function findIntent(id: string, reference: string, token: string): Promise<PaymentIntent | null> {
  if (id) {
    const byId = await db.paymentIntent.findUnique({ where: { id } });
    if (byId) return byId;
  }
  if (reference) {
    const byRef = await db.paymentIntent.findUnique({ where: { reference } });
    if (byRef) return byRef;
  }
  if (!token) return null;
  const debit = await db.debitOrder.findUnique({ where: { token } });
  return debit ? db.paymentIntent.findUnique({ where: { id: debit.intentId } }) : null;
}

/** Stops future debits. Apps already paid for stay open until their paid month ends. */
export async function cancelDebitOrder(debitId: string, organizationId: string, by: string) {
  const debit = await db.debitOrder.findFirst({ where: { id: debitId, organizationId } });
  if (!debit) return { error: "Not found", status: 404 } as const;
  if (debit.status !== "active") return { error: "This debit order is already cancelled.", status: 409 } as const;
  const cfg = payfastConfig(debit.sandbox);
  const res = await payfastApi(cfg, "PUT", `/subscriptions/${debit.token}/cancel`);
  const already = typeof res.data === "object" && res.data && JSON.stringify(res.data).toLowerCase().includes("cancel");
  if (!res.ok && !already) {
    await sendAlertEmail({ subject: "[TaskCrate] PayFast cancel failed", text: `${debit.token}: ${res.status} ${JSON.stringify(res.data).slice(0, 500)}` }).catch(() => undefined);
    return { error: "PayFast did not accept the cancellation. Try again in a minute, or contact support.", status: 502 } as const;
  }
  await db.debitOrder.update({ where: { id: debit.id }, data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: by } });
  return { ok: true } as const;
}
