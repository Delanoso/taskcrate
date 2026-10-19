import { NextResponse } from "next/server";
import { requireProductApi } from "@/lib/modules/api-guard";
import {
  BillingError,
  billingSnapshot,
  convertQuoteToInvoice,
  deleteBillingTemplate,
  saveBillingDocument,
  saveBillingProfile,
  saveBillingTemplate,
  sendBillingDocument,
  setBillingStatus,
} from "@/lib/modules/billing";

const SLUG = "quotations";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  return NextResponse.json(await billingSnapshot(gate.session.organizationId));
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  try {
    const org = gate.session.organizationId;
    if (action === "profile") return NextResponse.json({ profile: await saveBillingProfile(org, body) });
    if (action === "template") return NextResponse.json({ template: await saveBillingTemplate(org, body) });
    if (action === "delete_template") {
      await deleteBillingTemplate(org, String(body?.id ?? ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "document") return NextResponse.json({ document: await saveBillingDocument(org, body) });
    if (action === "status") return NextResponse.json({ document: await setBillingStatus(org, body) });
    if (action === "convert") return NextResponse.json({ document: await convertQuoteToInvoice(org, String(body?.id ?? "")) });
    if (action === "send") return NextResponse.json(await sendBillingDocument(org, String(body?.id ?? "")));
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof BillingError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
