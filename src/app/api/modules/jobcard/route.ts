import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { applyJobCardPatch, JobCardInputError, nextJobNumber, toJobCardSummary, toJobCardView } from "@/lib/modules/jobcard";

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

const patchSchema = z.object({
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
});

function slugFor(mode: string) {
  return mode === "field" ? "job-card-field" : "job-card-internal";
}

function badRequest(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Check the job card fields and try again." }, { status: 400 });
  }
  if (error instanceof JobCardInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  throw error;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "field" ? "field" : "internal";
  const gate = await requireProductApi(slugFor(mode));
  if ("error" in gate) return gate.error;

  const id = url.searchParams.get("id");
  if (id) {
    const item = await db.jobCard.findFirst({
      where: { id, organizationId: gate.session.organizationId, mode },
      include: { organization: { include: { branding: true } } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job: toJobCardView(item) });
  }

  const items = await db.jobCard.findMany({
    where: { organizationId: gate.session.organizationId, mode },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items: items.map(toJobCardSummary) });
}

export async function POST(req: Request) {
  try {
    const body = z.object({
      mode: z.enum(["internal", "field"]),
      title: z.string().trim().min(2).max(160),
      machineRef: z.string().trim().max(120).optional(),
      location: z.string().trim().max(160).optional(),
      priority: z.enum(["low", "normal", "urgent"]).optional(),
      description: z.string().trim().min(2).max(4000),
      reportedByName: z.string().trim().min(2).max(120),
      reportedByPhone: z.string().trim().max(40).optional(),
      openComment: z.string().trim().max(4000).optional(),
      openSignature: signatureSchema.optional(),
      newPhotos: z.array(photoSchema).max(4).optional(),
    }).parse(await req.json());

    const gate = await requireProductApi(slugFor(body.mode));
    if ("error" in gate) return gate.error;

    const created = await db.jobCard.create({
      data: {
        organizationId: gate.session.organizationId,
        mode: body.mode,
        jobNumber: await nextJobNumber(gate.session.organizationId),
        title: body.title,
        machineRef: body.machineRef || null,
        location: body.location || null,
        priority: body.priority ?? "normal",
        description: body.description,
        reportedByName: body.reportedByName,
        reportedByPhone: body.reportedByPhone || null,
        openComment: body.openComment || null,
        status: "open",
      },
      include: { organization: { include: { branding: true } } },
    });

    if (!body.openSignature && !body.newPhotos?.length) {
      return NextResponse.json({ job: toJobCardView(created) });
    }

    try {
      const item = await applyJobCardPatch(created, {
        openSignature: body.openSignature,
        newPhotos: body.newPhotos?.map((photo) => ({ ...photo, side: "open" as const })),
      });
      return NextResponse.json({ job: toJobCardView(item) });
    } catch (error) {
      await db.jobCard.delete({ where: { id: created.id } }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return badRequest(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = z.object({
      id: z.string(),
      mode: z.enum(["internal", "field"]),
    }).and(patchSchema).parse(await req.json());

    const gate = await requireProductApi(slugFor(body.mode));
    if ("error" in gate) return gate.error;

    const existing = await db.jobCard.findFirst({
      where: { id: body.id, organizationId: gate.session.organizationId, mode: body.mode },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { id: _id, mode: _mode, ...patch } = body;
    const item = await applyJobCardPatch(existing, patch);
    return NextResponse.json({ job: toJobCardView(item) });
  } catch (error) {
    return badRequest(error);
  }
}
