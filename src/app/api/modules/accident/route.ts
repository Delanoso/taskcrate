import { NextResponse } from "next/server";
import { requireProductApi } from "@/lib/modules/api-guard";
import { AccidentError, accidentSnapshot, fileAccident } from "@/lib/modules/accident";

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
    const report = await fileAccident(gate.session.organizationId, await req.json().catch(() => null));
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AccidentError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
