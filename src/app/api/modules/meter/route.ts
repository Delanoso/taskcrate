import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildWhatsAppShareLink } from "@/lib/whatsapp";

export async function GET() {
  const gate = await requireProductApi("meter-variance");
  if ("error" in gate) return gate.error;
  const sites = await db.meterSite.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { readings: { orderBy: { createdAt: "desc" }, take: 12 } },
  });
  return NextResponse.json({ sites });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("meter-variance");
  if ("error" in gate) return gate.error;
  const body = z.discriminatedUnion("action", [
    z.object({
      action: z.literal("create_site"),
      name: z.string().min(2),
      meterType: z.enum(["water", "electricity"]),
      alertThreshold: z.number().positive().optional(),
      alertPhone: z.string().optional(),
    }),
    z.object({
      action: z.literal("reading"),
      siteId: z.string(),
      reading: z.number(),
      occupancy: z.number().int().nonnegative().optional(),
    }),
  ]).parse(await req.json());

  if (body.action === "create_site") {
    const site = await db.meterSite.create({
      data: {
        organizationId: gate.session.organizationId,
        name: body.name,
        meterType: body.meterType,
        alertThreshold: body.alertThreshold ?? 1.5,
        alertPhone: body.alertPhone,
      },
    });
    return NextResponse.json({ site });
  }

  const site = await db.meterSite.findFirst({
    where: { id: body.siteId, organizationId: gate.session.organizationId },
    include: { readings: { orderBy: { createdAt: "desc" }, take: 8 }, organization: true },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let alerted = false;
  let whatsAppUrl: string | undefined;
  if (site.readings.length >= 2) {
    const recent = site.readings.slice(0, 4);
    const deltas = [];
    for (let i = 0; i < recent.length - 1; i++) {
      deltas.push(Math.abs(recent[i].reading - recent[i + 1].reading));
    }
    const baseline = deltas.reduce((a, b) => a + b, 0) / Math.max(deltas.length, 1);
    const last = site.readings[0].reading;
    const velocity = Math.abs(body.reading - last);
    const occUp = (body.occupancy ?? 0) > (site.readings[0].occupancy ?? 0);
    if (baseline > 0 && velocity > baseline * site.alertThreshold && !occUp) {
      alerted = true;
      const share = buildWhatsAppShareLink({
        organizationSlug: site.organization.slug,
        documentType: "meter-alert",
        documentId: site.id,
      });
      const msg = `ALERT: ${site.name} (${site.meterType}) usage spike. Reading ${body.reading} vs last ${last}. Baseline~${baseline.toFixed(1)}. Investigate leak.`;
      const phone = (site.alertPhone ?? "").replace(/\D/g, "");
      whatsAppUrl = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        : share.whatsAppUrl;
      await db.notification.create({
        data: {
          organizationId: gate.session.organizationId,
          productSlug: "meter-variance",
          title: "Meter variance emergency",
          body: msg,
        },
      });
    }
  }

  const reading = await db.meterReading.create({
    data: {
      siteId: site.id,
      reading: body.reading,
      occupancy: body.occupancy ?? 0,
      alerted,
    },
  });
  return NextResponse.json({ reading, alerted, whatsAppUrl });
}
