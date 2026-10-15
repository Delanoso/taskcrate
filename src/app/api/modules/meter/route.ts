import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { MeterError, checkReading, logReading, toReadingView, toSiteDetail, toSiteSummary } from "@/lib/modules/meter";
import { unitForType } from "@/lib/modules/meter-shared";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);
const photoSchema = z.string().startsWith("data:image/").max(1_500_000);

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_site"),
    name: z.string().trim().min(2, "Add the meter name.").max(160),
    meterType: z.enum(["water", "electricity"]),
    meterNumber: z.string().trim().max(80).optional(),
    accountNumber: z.string().trim().max(80).optional(),
    municipality: z.string().trim().max(120).optional(),
    location: z.string().trim().max(200).optional(),
    alertThreshold: z.number().positive().max(20).optional(),
    alertPhone: z.string().trim().max(40).optional(),
  }),
  z.object({
    action: z.literal("reading"),
    siteId: z.string().min(1),
    reading: z.number(),
    occupancy: z.number().int().nonnegative().optional(),
    readerName: z.string().trim().min(1, "Add the name of the person who read the meter.").max(120),
    readerSignature: signatureSchema,
    photo: photoSchema,
    extraPhoto: photoSchema.optional(),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("check"),
    readingId: z.string().min(1),
    checkedByName: z.string().trim().min(1, "Add the name of the person who checked the meter.").max(120),
    checkedSignature: signatureSchema,
    checkNote: z.string().trim().min(1, "Write what you found.").max(2000),
    checkPhoto: photoSchema.optional(),
  }),
]);

function blankToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET(req: Request) {
  const gate = await requireProductApi("meter-variance");
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const site = await db.meterSite.findFirst({
      where: { id, organizationId: gate.session.organizationId },
      include: { readings: { orderBy: { createdAt: "desc" }, take: 40 } },
    });
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ site: toSiteDetail(site, true) });
  }
  const sites = await db.meterSite.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { readings: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ sites: sites.map((site) => toSiteSummary(site)) });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("meter-variance");
  if ("error" in gate) return gate.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    if (body.action === "create_site") {
      const site = await db.meterSite.create({
        data: {
          organizationId: gate.session.organizationId,
          name: body.name,
          meterType: body.meterType,
          meterNumber: blankToUndefined(body.meterNumber),
          accountNumber: blankToUndefined(body.accountNumber),
          municipality: blankToUndefined(body.municipality),
          location: blankToUndefined(body.location),
          unit: unitForType(body.meterType),
          alertThreshold: body.alertThreshold ?? 1.5,
          alertPhone: blankToUndefined(body.alertPhone),
        },
      });
      return NextResponse.json({ site: toSiteSummary({ ...site, readings: [] }) });
    }

    if (body.action === "reading") {
      const site = await db.meterSite.findFirst({
        where: { id: body.siteId, organizationId: gate.session.organizationId },
        include: { readings: { orderBy: { createdAt: "desc" }, take: 8 }, organization: true },
      });
      if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const saved = await logReading({
        site,
        reading: body.reading,
        occupancy: body.occupancy,
        readerName: body.readerName,
        readerSignature: body.readerSignature,
        photo: body.photo,
        extraPhoto: body.extraPhoto,
        note: body.note,
      });
      return NextResponse.json({
        reading: toReadingView(saved.reading, true),
        alerted: saved.reading.alerted,
        whatsAppUrl: saved.whatsAppUrl ?? null,
      });
    }

    const reading = await db.meterReading.findFirst({
      where: { id: body.readingId, site: { organizationId: gate.session.organizationId } },
    });
    if (!reading) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const saved = await checkReading({
      reading,
      organizationId: gate.session.organizationId,
      checkedByName: body.checkedByName,
      checkedSignature: body.checkedSignature,
      checkNote: body.checkNote,
      checkPhoto: body.checkPhoto,
    });
    return NextResponse.json({ reading: toReadingView(saved, true) });
  } catch (err) {
    if (err instanceof MeterError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
