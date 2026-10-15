import { NextResponse } from "next/server";
import Stripe from "stripe";
import { extendRentByPaymentRef, stopRentByPaymentRef } from "@/lib/billing";
import { grantPaidPeriod } from "@/lib/billing";
import { provisionWorkspaceFromPayment } from "@/lib/provision";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !secret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 501 });
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    const meta = session.metadata ?? {};
    const paymentRef = stripeId(session.subscription) ?? session.id;
    if (meta.organizationId && meta.productSlug) {
      await grantPaidPeriod({
        organizationId: meta.organizationId,
        productSlug: meta.productSlug,
        paymentRef,
        provider: "stripe",
      });
    } else if (meta.email && meta.fullName && meta.companyName && meta.productSlug) {
      await provisionWorkspaceFromPayment({
        email: meta.email,
        fullName: meta.fullName,
        companyName: meta.companyName,
        productSlug: meta.productSlug,
        paymentRef,
        provider: "stripe",
      });
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { billing_reason?: string };
    if (invoice.billing_reason === "subscription_cycle") {
      const paymentRef = stripeId(invoiceSubscription(invoice));
      if (paymentRef) await extendRentByPaymentRef(paymentRef);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const paymentRef = stripeId(invoiceSubscription(invoice));
    if (paymentRef) {
      await stopRentByPaymentRef(paymentRef, "past_due", "the monthly card payment failed");
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await stopRentByPaymentRef(subscription.id, "canceled", "the card subscription was cancelled");
  }

  return NextResponse.json({ received: true });
}

function stripeId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function invoiceSubscription(invoice: Stripe.Invoice) {
  const record = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } };
  };
  return record.subscription ?? record.parent?.subscription_details?.subscription ?? null;
}
