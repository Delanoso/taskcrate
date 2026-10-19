import { NextResponse } from "next/server";
import { requireProductApi } from "@/lib/modules/api-guard";
import { listBills, markBillPaid, saveBill } from "@/lib/modules/bills";

export async function GET() {
  const gate = await requireProductApi("bills-to-pay");
  if ("error" in gate) return gate.error;
  return NextResponse.json({ bills: await listBills(gate.session.organizationId) });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("bills-to-pay");
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  try {
    if (body?.action === "paid") {
      const bill = await markBillPaid(gate.session.organizationId, String(body.id ?? ""), Boolean(body.paid));
      return NextResponse.json({ bill });
    }
    return NextResponse.json({ bill: await saveBill(gate.session.organizationId, body) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save" }, { status: 400 });
  }
}
