import { NextResponse } from "next/server";
import { requireProductApi } from "@/lib/modules/api-guard";
import { TrainingError, importTrainingTickets, saveTrainingTicket, trainingSnapshot } from "@/lib/modules/training";
import type { TrainingImportRow } from "@/lib/modules/training-import";

const SLUG = "training-tickets";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  return NextResponse.json(await trainingSnapshot(gate.session.organizationId));
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  try {
    if (body?.action === "import") {
      const result = await importTrainingTickets(gate.session.organizationId, Array.isArray(body.rows) ? (body.rows as TrainingImportRow[]) : []);
      return NextResponse.json(result);
    }
    const ticket = await saveTrainingTicket(gate.session.organizationId, body);
    return NextResponse.json({ ticket });
  } catch (error) {
    if (error instanceof TrainingError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
