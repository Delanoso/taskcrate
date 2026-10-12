import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getProduct, PRODUCTS, RENT_ZAR } from "@/data/products";
import { db } from "@/lib/db";
import { rentAmountCentsZar } from "@/lib/pricing";
import { provisionWorkspaceFromPayment } from "@/lib/provision";
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

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  const session = await getSession();

  if (body.allProducts) {
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    for (const p of PRODUCTS) {
      await db.subscription.upsert({
        where: {
          organizationId_productSlug: {
            organizationId: session.organizationId,
            productSlug: p.slug,
          },
        },
        create: {
          organizationId: session.organizationId,
          productSlug: p.slug,
          status: "active",
        },
        update: { status: "active" },
      });
    }
    return NextResponse.json({
      ok: true,
      mode: "demo",
      redirectUrl: `${appUrl}/dashboard?subscribed=all`,
    });
  }

  const productSlug = body.productSlug;
  if (!productSlug || !getProduct(productSlug)) {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }

  // Guest one-click rent
  if (body.guest) {
    if (!body.email || !body.fullName || !body.companyName || !body.acceptedTerms) {
      return NextResponse.json(
        { error: "Name, email, company, and Terms acceptance are required." },
        { status: 400 },
      );
    }

    const payfastId = process.env.PAYFAST_MERCHANT_ID;
    const payfastKey = process.env.PAYFAST_MERCHANT_KEY;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const product = getProduct(productSlug)!;

    if (payfastId && payfastKey) {
      const fields: Record<string, string> = {
        merchant_id: payfastId,
        merchant_key: payfastKey,
        return_url: `${appUrl}/checkout/success?provider=payfast&product=${productSlug}`,
        cancel_url: `${appUrl}/products/${productSlug}`,
        notify_url: `${appUrl}/api/webhooks/payfast`,
        name_first: body.fullName.split(" ")[0] ?? body.fullName,
        name_last: body.fullName.split(" ").slice(1).join(" ") || "Customer",
        email_address: body.email,
        m_payment_id: `${productSlug}-${Date.now()}`,
        amount: RENT_ZAR.toFixed(2),
        item_name: `${product.name} — monthly rent`,
        custom_str1: productSlug,
        custom_str2: body.email,
        custom_str3: body.companyName,
        custom_str4: body.fullName,
      };
      if (process.env.PAYFAST_PASSPHRASE) {
        fields.passphrase = process.env.PAYFAST_PASSPHRASE;
      }
      const signature = payfastSignature(fields, process.env.PAYFAST_PASSPHRASE);
      delete fields.passphrase;
      fields.signature = signature;

      const action =
        process.env.PAYFAST_SANDBOX === "false"
          ? "https://www.payfast.co.za/eng/process"
          : "https://sandbox.payfast.co.za/eng/process";

      const inputs = Object.entries(fields)
        .map(
          ([k, v]) =>
            `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`,
        )
        .join("");
      const payfastHtml = `<!doctype html><html><body><p>Redirecting to PayFast…</p><form id="pf" action="${action}" method="post">${inputs}</form><script>document.getElementById('pf').submit()</script></body></html>`;
      return NextResponse.json({ ok: true, mode: "payfast", payfastHtml });
    }

    if (stripeKey) {
      const stripe = new Stripe(stripeKey);
      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: body.email,
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/products/${productSlug}`,
        metadata: {
          productSlug,
          email: body.email,
          fullName: body.fullName,
          companyName: body.companyName,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "zar",
              unit_amount: rentAmountCentsZar(),
              recurring: { interval: "month" },
              product_data: {
                name: `${product.name} — Delano rent`,
                metadata: { productSlug },
              },
            },
          },
        ],
      });
      return NextResponse.json({ ok: true, mode: "stripe", url: checkout.url });
    }

    // Demo autopilot provision (no payment keys configured)
    const provisioned = await provisionWorkspaceFromPayment({
      email: body.email,
      fullName: body.fullName,
      companyName: body.companyName,
      productSlug,
      paymentRef: `demo-${Date.now()}`,
      provider: "demo",
      autoLogin: true,
    });

    return NextResponse.json({
      ok: true,
      mode: "demo",
      temporaryPassword: provisioned.temporaryPassword,
      redirectUrl: `${appUrl}/dashboard/apps/${productSlug}?provisioned=1`,
    });
  }

  // Logged-in subscribe (existing flow)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    await db.subscription.upsert({
      where: {
        organizationId_productSlug: {
          organizationId: session.organizationId,
          productSlug,
        },
      },
      create: {
        organizationId: session.organizationId,
        productSlug,
        status: "active",
      },
      update: { status: "active" },
    });
    return NextResponse.json({
      ok: true,
      mode: "demo",
      redirectUrl: `${appUrl}/dashboard/apps/${productSlug}?subscribed=1`,
    });
  }

  const product = getProduct(productSlug)!;
  const org = await db.organization.findUniqueOrThrow({
    where: { id: session.organizationId },
  });
  const stripe = new Stripe(stripeKey);
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/products/${productSlug}`,
    client_reference_id: session.organizationId,
    metadata: { organizationId: session.organizationId, productSlug },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "zar",
          unit_amount: rentAmountCentsZar(),
          recurring: { interval: "month" },
          product_data: {
            name: `${product.name} — ${org.name}`,
            metadata: { productSlug },
          },
        },
      },
    ],
  });

  return NextResponse.json({ ok: true, mode: "stripe", url: checkout.url });
}

function payfastSignature(data: Record<string, string>, passphrase?: string) {
  const keys = Object.keys(data)
    .filter((k) => data[k] !== "" && k !== "signature")
    .sort();
  let paramString = keys
    .map((k) => `${k}=${encodeURIComponent(data[k]).replace(/%20/g, "+")}`)
    .join("&");
  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  }
  return createHash("md5").update(paramString).digest("hex");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
