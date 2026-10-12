import { NextResponse } from "next/server";
import Stripe from "stripe";
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
    const meta = session.metadata ?? {};
    if (meta.email && meta.fullName && meta.companyName && meta.productSlug) {
      await provisionWorkspaceFromPayment({
        email: meta.email,
        fullName: meta.fullName,
        companyName: meta.companyName,
        productSlug: meta.productSlug,
        paymentRef: session.subscription?.toString() ?? session.id,
        provider: "stripe",
      });
    }
  }

  return NextResponse.json({ received: true });
}
