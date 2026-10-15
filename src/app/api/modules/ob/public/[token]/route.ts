import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ObError, logObEntry, toEntryView, wakeDue } from "@/lib/modules/ob";
import { OB_CATEGORIES, formatWhen } from "@/lib/modules/ob-shared";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);
const photoSchema = z.string().startsWith("data:image/").max(1_500_000);

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.obSite.findUnique({
    where: { publicToken: token },
    include: {
      organization: { include: { branding: true } },
      entries: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const last = site.entries[0] ?? null;
  return NextResponse.json({
    site: {
      name: site.name,
      location: site.location,
      companyName: site.organization.branding?.displayName ?? site.organization.name,
      categories: OB_CATEGORIES.map((item) => ({ label: item.label, handover: "handover" in item && item.handover })),
      wakeMinutes: site.wakeMinutes,
      wakeDue: wakeDue(last?.createdAt ?? null, site.wakeMinutes),
      lastAt: last ? formatWhen(last.createdAt.toISOString()) : null,
    },
    recent: site.entries.map((entry) => toEntryView(entry, false)),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.obSite.findUnique({ where: { publicToken: token } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = z
    .object({
      category: z.string().min(2),
      notes: z.string().max(4000),
      people: z.string().max(500).optional(),
      actionTaken: z.string().max(2000).optional(),
      guardName: z.string().trim().min(1).max(120),
      guardSignature: signatureSchema,
      photo: photoSchema,
      extraPhoto: photoSchema.optional(),
      handoverToName: z.string().max(120).optional(),
      handoverToSignature: signatureSchema.optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    const entry = await logObEntry({ site, ...parsed.data });
    return NextResponse.json({ entry: toEntryView(entry, true) });
  } catch (err) {
    if (err instanceof ObError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.obSite.findUnique({
    where: { publicToken: token },
    include: { entries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const last = site.entries[0] ?? null;
  if (!wakeDue(last?.createdAt ?? null, site.wakeMinutes)) return NextResponse.json({ ok: true, wake: false });
  const gapMin = last ? Math.floor((Date.now() - last.createdAt.getTime()) / 60000) : null;
  const msg = gapMin == null
    ? `OB wake-up check: no entry has been filed at ${site.name}. Log one now.`
    : `OB wake-up check: no entry for ${gapMin} min at ${site.name}. Log one now.`;
  const guard = (site.guardPhone ?? "").replace(/\D/g, "");
  const control = (site.controlPhone ?? "").replace(/\D/g, "");
  await db.notification.create({
    data: {
      organizationId: site.organizationId,
      productSlug: "digital-ob",
      title: "OB wake-up check",
      body: msg,
    },
  });
  return NextResponse.json({
    ok: true,
    wake: true,
    message: msg,
    guardWhatsApp: guard ? `https://wa.me/${guard}?text=${encodeURIComponent(msg)}` : null,
    controlWhatsApp: control ? `https://wa.me/${control}?text=${encodeURIComponent(msg)}` : null,
  });
}
