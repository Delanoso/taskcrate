import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { saveDataUrlUpload } from "@/lib/uploads";

export async function GET() {
  const gate = await requireProductApi("discipline-log");
  if ("error" in gate) return gate.error;
  const items = await db.disciplineEntry.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { incidentAt: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("discipline-log");
  if ("error" in gate) return gate.error;
  const body = z.object({
    employeeName: z.string().min(2),
    stage: z.enum(["verbal", "written", "final", "dismissal"]),
    notes: z.string().min(2),
    incidentAt: z.string(),
    photoDataUrl: z.string().startsWith("data:image/").optional(),
  }).parse(await req.json());
  let photoUrl: string | undefined;
  if (body.photoDataUrl) {
    photoUrl = await saveDataUrlUpload(body.photoDataUrl, `discipline/${gate.session.organizationId}`);
  }
  const item = await db.disciplineEntry.create({
    data: {
      organizationId: gate.session.organizationId,
      employeeName: body.employeeName,
      stage: body.stage,
      notes: body.notes,
      incidentAt: new Date(body.incidentAt),
      photoUrl,
    },
  });
  return NextResponse.json({ item });
}
