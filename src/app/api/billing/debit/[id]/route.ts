import { NextResponse } from "next/server";
import { requireBillingApi } from "@/lib/billing-guard";
import { cancelDebitOrder } from "@/lib/payments";

/** Cancels a PayFast debit order; the apps it paid for stay open until their paid month ends. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireBillingApi();
  if ("error" in gate) return gate.error;
  const r = await cancelDebitOrder((await params).id, gate.session.organizationId, gate.user.fullName);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
