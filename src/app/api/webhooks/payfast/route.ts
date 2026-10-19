import { NextResponse } from "next/server";
import { handlePayfastItn } from "@/lib/payments";

/** PayFast ITN (instant transaction notification) for first payments, monthly debits and cancellations. */
export async function POST(req: Request) {
  const form = await req.formData();
  const result = await handlePayfastItn(form);
  if (result.note && result.note !== "first" && result.note !== "recurring") {
    console.log(`PayFast ITN ${String(form.get("m_payment_id") ?? "")} ${String(form.get("payment_status") ?? "")}: ${result.note}`);
  }
  return new NextResponse(result.body, { status: result.status });
}
