import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyJobCardPatch, JobCardInputError, toJobCardView } from "@/lib/modules/jobcard";

const photoSchema = z.object({
  dataUrl: z.string().startsWith("data:image/").max(1_500_000),
  side: z.enum(["open", "work"]),
});

const partSchema = z.object({
  name: z.string().trim().min(1).max(120),
  qty: z.number().positive().max(9999),
  cost: z.number().min(0).max(1_000_000),
});

const signatureSchema = z.string().startsWith("data:image/").max(500_000);

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.jobCard.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = toJobCardView(item);
  delete job.publicToken;
  return NextResponse.json({ job });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const item = await db.jobCard.findUnique({ where: { publicToken: token } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = z.object({
      title: z.string().trim().min(2).max(160).optional(),
      machineRef: z.string().trim().max(120).nullable().optional(),
      location: z.string().trim().max(160).nullable().optional(),
      priority: z.enum(["low", "normal", "urgent"]).optional(),
      description: z.string().trim().max(4000).nullable().optional(),
      reportedByName: z.string().trim().max(120).nullable().optional(),
      reportedByPhone: z.string().trim().max(40).nullable().optional(),
      openComment: z.string().trim().max(4000).nullable().optional(),
      openSignature: signatureSchema.optional(),
      mechanicName: z.string().trim().max(120).nullable().optional(),
      workComment: z.string().trim().max(4000).nullable().optional(),
      technicianSignature: signatureSchema.optional(),
      hoursWorked: z.number().min(0).max(999).nullable().optional(),
      downtimeHours: z.number().min(0).max(9999).nullable().optional(),
      parts: z.array(partSchema).max(40).optional(),
      acceptName: z.string().trim().max(120).nullable().optional(),
      acceptComment: z.string().trim().max(4000).nullable().optional(),
      acceptSignature: signatureSchema.optional(),
      status: z.enum(["open", "scheduled", "in_progress", "done"]).optional(),
      newPhotos: z.array(photoSchema).max(4).optional(),
    }).parse(await req.json());

    const updated = await applyJobCardPatch(item, body);
    const job = toJobCardView(updated);
    delete job.publicToken;
    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the job card fields and try again." }, { status: 400 });
    }
    if (error instanceof JobCardInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
