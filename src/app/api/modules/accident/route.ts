import { NextResponse } from "next/server";
import { requireProductApi } from "@/lib/modules/api-guard";
import { AccidentError, accidentSnapshot, fileAccident, linkAccident, saveInvestigation } from "@/lib/modules/accident";

const SLUG = "accident-report";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  return NextResponse.json(await accidentSnapshot(gate.session.organizationId));
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  try {
    const body = await req.json().catch(() => null);
    const org = gate.session.organizationId;
    if (body?.action === "investigate" || body?.action === "close") {
      return NextResponse.json({ report: await saveInvestigation(org, body, body.action === "close") });
    }
    if (body?.action === "link") return NextResponse.json(await linkAccident(org, body));
    const report = await fileAccident(org, body);
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AccidentError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
