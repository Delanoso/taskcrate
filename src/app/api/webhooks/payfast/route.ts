import { NextResponse } from "next/server";
import { stopRentByEmail } from "@/lib/billing";
import {
  amountMatchesRent,
  confirmPayfastItn,
  payfastConfigured,
  payfastItnSignature,
  payfastItnString,
} from "@/lib/payfast";
import { provisionWorkspaceFromPayment } from "@/lib/provision";

/**
 * PayFast ITN. A COMPLETE payment opens the app for one month.
 * CANCELLED closes it. Anything that fails the security checks is ignored.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  if (!payfastConfigured()) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const entries: Array<[string, string]> = [];
  for (const [key, value] of form.entries()) {
    if (key === "signature") break;
    entries.push([key, String(value)]);
  }
  const paramString = payfastItnString(entries);
  const expected = payfastItnSignature(entries, process.env.PAYFAST_PASSPHRASE);
  const received = String(form.get("signature") ?? "");
  if (!received || received !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const merchantId = String(form.get("merchant_id") ?? "");
  if (merchantId !== process.env.PAYFAST_MERCHANT_ID) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let confirmed = false;
  try {
    confirmed = await confirmPayfastItn(paramString);
  } catch {
    return NextResponse.json({ error: "PayFast could not be reached" }, { status: 503 });
  }
  if (!confirmed) return NextResponse.json({ ok: true, ignored: true });

  const status = String(form.get("payment_status") ?? "");
  const productSlug = String(form.get("custom_str1") ?? "");
  const email = String(form.get("custom_str2") ?? "");
  const companyName = String(form.get("custom_str3") ?? "");
  const fullName = String(form.get("custom_str4") ?? "");
  const paymentRef = String(form.get("pf_payment_id") ?? form.get("m_payment_id") ?? "");
  const payfastToken = String(form.get("token") ?? "") || undefined;

  if (status === "CANCELLED") {
    if (email && productSlug) {
      await stopRentByEmail({
        email,
        productSlug,
        status: "canceled",
        reason: "the PayFast debit was cancelled",
      });
    }
    return new NextResponse("OK", { status: 200 });
  }

  if (status !== "COMPLETE") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!amountMatchesRent(String(form.get("amount_gross") ?? ""))) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (!productSlug || !email || !companyName || !fullName) {
    return NextResponse.json({ error: "Missing custom fields" }, { status: 400 });
  }

  await provisionWorkspaceFromPayment({
    email,
    fullName,
    companyName,
    productSlug,
    paymentRef,
    payfastToken,
    provider: "payfast",
  });

  return new NextResponse("OK", { status: 200 });
}
