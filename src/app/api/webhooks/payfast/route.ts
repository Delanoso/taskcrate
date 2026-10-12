import { NextResponse } from "next/server";
import { provisionWorkspaceFromPayment } from "@/lib/provision";

/**
 * PayFast ITN (Instant Transaction Notification).
 * Validates payment_status=COMPLETE then provisions workspace from custom_str fields.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const status = String(form.get("payment_status") ?? "");
  if (status !== "COMPLETE") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const productSlug = String(form.get("custom_str1") ?? "");
  const email = String(form.get("custom_str2") ?? "");
  const companyName = String(form.get("custom_str3") ?? "");
  const fullName = String(form.get("custom_str4") ?? "");
  const paymentRef = String(form.get("pf_payment_id") ?? form.get("m_payment_id") ?? "");

  if (!productSlug || !email || !companyName || !fullName) {
    return NextResponse.json({ error: "Missing custom fields" }, { status: 400 });
  }

  await provisionWorkspaceFromPayment({
    email,
    fullName,
    companyName,
    productSlug,
    paymentRef,
    provider: "payfast",
  });

  return new NextResponse("OK", { status: 200 });
}
