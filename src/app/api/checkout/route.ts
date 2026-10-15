import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getProduct } from "@/data/products";
import { db } from "@/lib/db";
import { monthQuote, rentAmountCentsZar } from "@/lib/pricing";
import {
  buildPayfastFields,
  payfastConfigured,
  payfastFormHtml,
  payfastSignature,
} from "@/lib/payfast";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { isCompanyAdmin } from "@/lib/rbac";
import { getSession } from "@/lib/session";

const schema = z.object({
  productSlug: z.string().optional(),
  allProducts: z.boolean().optional(),
  guest: z.boolean().optional(),
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  companyName: z.string().min(2).optional(),
  acceptedTerms: z.boolean().optional(),
});

const PAYMENT_REQUIRED = "This app stays closed until the monthly rent is paid.";

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  const session = await getSession();

  if (body.allProducts) {
    return NextResponse.json(
      { error: "Each app opens after its own monthly payment." },
      { status: 402 },
    );
  }

  const productSlug = body.productSlug;
  const product = productSlug ? getProduct(productSlug) : undefined;
  if (!productSlug || !product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  if (body.guest && !session) {
    if (!body.email || !body.fullName || !body.companyName || !body.acceptedTerms) {
      return NextResponse.json(
        { error: "Name, email, company, and Terms acceptance are required." },
        { status: 400 },
      );
    }
    return startCheckout({
      appUrl,
      productSlug,
      productName: product.name,
      email: body.email,
      fullName: body.fullName,
      companyName: body.companyName,
    });
  }

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, org] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.organization.findUnique({ where: { id: session.organizationId } }),
  ]);
  if (!user || !org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isPlatformAdmin(user)) {
    const membership = await db.membership.findUnique({
      where: {
        userId_organizationId: { userId: user.id, organizationId: org.id },
      },
    });
    if (!membership || !isCompanyAdmin(membership.role)) {
      return NextResponse.json({ error: "Only an admin can add an app." }, { status: 403 });
    }
  }

  return startCheckout({
    appUrl,
    productSlug,
    productName: product.name,
    email: user.email,
    fullName: user.fullName,
    companyName: org.name,
    organizationId: org.id,
  });
}

async function startCheckout(input: {
  appUrl: string;
  productSlug: string;
  productName: string;
  email: string;
  fullName: string;
  companyName: string;
  organizationId?: string;
}) {
  if (payfastConfigured()) {
    if (!process.env.PAYFAST_PASSPHRASE) {
      return NextResponse.json(
        { error: "Monthly card debit needs the PayFast passphrase on the server before a company can pay." },
        { status: 503 },
      );
    }
    const fields = buildPayfastFields(input);
    const signature = payfastSignature(fields, process.env.PAYFAST_PASSPHRASE);
    return NextResponse.json({
      ok: true,
      mode: "payfast",
      payfastHtml: payfastFormHtml({ ...fields, signature }),
    });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const quote = monthQuote();
    const stripe = new Stripe(stripeKey);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.email,
      success_url: input.organizationId
        ? `${input.appUrl}/dashboard/billing?success=1`
        : `${input.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.appUrl}/products/${input.productSlug}`,
      client_reference_id: input.organizationId,
      metadata: {
        productSlug: input.productSlug,
        email: input.email,
        fullName: input.fullName,
        companyName: input.companyName,
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "zar",
            unit_amount: rentAmountCentsZar(),
            recurring: { interval: "month" },
            product_data: {
              name: `${input.productName} — TaskCrate`,
              metadata: { productSlug: input.productSlug },
            },
          },
        },
      ],
      subscription_data: {
        billing_cycle_anchor: Math.floor(quote.periodEnd.getTime() / 1000),
        proration_behavior: "create_prorations",
      },
    });
    return NextResponse.json({ ok: true, mode: "stripe", url: checkout.url });
  }

  return NextResponse.json({ error: PAYMENT_REQUIRED }, { status: 402 });
}
