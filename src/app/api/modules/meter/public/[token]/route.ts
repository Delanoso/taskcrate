import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { MeterError, logReading, toReadingView } from "@/lib/modules/meter";
import { formatAmount, meterTypeLabel } from "@/lib/modules/meter-shared";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);
const photoSchema = z.string().startsWith("data:image/").max(1_500_000);

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.meterSite.findUnique({
    where: { publicToken: token },
    include: {
      organization: { include: { branding: true } },
      readings: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const latest = site.readings[0] ?? null;
  return NextResponse.json({
    site: {
      name: site.name,
      meterType: site.meterType,
      typeLabel: meterTypeLabel(site.meterType),
      meterNumber: site.meterNumber,
      location: site.location,
      unit: site.unit,
      companyName: site.organization.branding?.displayName ?? site.organization.name,
      lastReading: latest ? formatAmount(latest.reading, site.unit) : null,
      lastValue: latest?.reading ?? null,
      lastAt: latest?.createdAt.toISOString() ?? null,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.meterSite.findUnique({
    where: { publicToken: token },
    include: { readings: { orderBy: { createdAt: "desc" }, take: 8 }, organization: true },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = z
    .object({
      reading: z.number(),
      occupancy: z.number().int().nonnegative().optional(),
      readerName: z.string().trim().min(1).max(120),
      readerSignature: signatureSchema,
      photo: photoSchema,
      extraPhoto: photoSchema.optional(),
      note: z.string().max(2000).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    const saved = await logReading({ site, ...parsed.data });
    return NextResponse.json({
      reading: toReadingView(saved.reading, true),
      alerted: saved.reading.alerted,
    });
  } catch (err) {
    if (err instanceof MeterError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
