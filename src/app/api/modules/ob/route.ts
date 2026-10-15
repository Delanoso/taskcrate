import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { ObError, logObEntry, toEntryView, toSiteDetail, toSiteSummary } from "@/lib/modules/ob";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);
const photoSchema = z.string().startsWith("data:image/").max(1_500_000);

const entrySchema = z.object({
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
});

function blank(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET(req: Request) {
  const gate = await requireProductApi("digital-ob");
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const site = await db.obSite.findFirst({
      where: { id, organizationId: gate.session.organizationId },
      include: { entries: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ site: toSiteDetail(site, true) });
  }
  const sites = await db.obSite.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { entries: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ sites: sites.map((site) => toSiteSummary(site)) });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("digital-ob");
  if ("error" in gate) return gate.error;
  const parsed = z.discriminatedUnion("action", [
    z.object({
      action: z.literal("create_site"),
      name: z.string().trim().min(2, "Add the site name.").max(160),
      location: z.string().trim().max(200).optional(),
      wakeMinutes: z.number().int().min(15).max(240).optional(),
      guardPhone: z.string().trim().max(40).optional(),
      controlPhone: z.string().trim().max(40).optional(),
    }),
    entrySchema.extend({ action: z.literal("entry"), siteId: z.string().min(1) }),
  ]).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    if (body.action === "create_site") {
      const site = await db.obSite.create({
        data: {
          organizationId: gate.session.organizationId,
          name: body.name,
          location: blank(body.location),
          wakeMinutes: body.wakeMinutes ?? 60,
          guardPhone: blank(body.guardPhone),
          controlPhone: blank(body.controlPhone),
        },
      });
      return NextResponse.json({ site: toSiteSummary({ ...site, entries: [] }) });
    }

    const site = await db.obSite.findFirst({
      where: { id: body.siteId, organizationId: gate.session.organizationId },
    });
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const entry = await logObEntry({ site, ...body });
    return NextResponse.json({ entry: toEntryView(entry, true) });
  } catch (err) {
    if (err instanceof ObError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
