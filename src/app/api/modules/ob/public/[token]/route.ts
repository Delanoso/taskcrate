import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.obSite.findUnique({
    where: { publicToken: token },
    include: {
      organization: { include: { branding: true } },
      entries: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const last = site.entries[0];
  const gapMin = last ? (Date.now() - last.createdAt.getTime()) / 60000 : 999;
  const wakeDue = gapMin >= site.wakeMinutes;
  return NextResponse.json({
    site: {
      name: site.name,
      companyName: site.organization.branding?.displayName ?? site.organization.name,
      categories: ["Patrol Started", "Gate Incident", "Shift Handover", "Visitor Logged", "Alarm Event", "Other"],
      wakeDue,
      wakeMinutes: site.wakeMinutes,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.obSite.findUnique({ where: { publicToken: token } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    category: z.string().min(2),
    notes: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).parse(await req.json());
  const entry = await db.obEntry.create({
    data: {
      siteId: site.id,
      category: body.category,
      notes: body.notes,
      lat: body.lat,
      lng: body.lng,
    },
  });
  return NextResponse.json({ ok: true, entry, timestamp: entry.createdAt });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  // wake-up check endpoint
  const { token } = await params;
  const site = await db.obSite.findUnique({
    where: { publicToken: token },
    include: { entries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const last = site.entries[0];
  const gapMin = last ? (Date.now() - last.createdAt.getTime()) / 60000 : 999;
  if (gapMin < site.wakeMinutes) return NextResponse.json({ ok: true, wake: false });
  const msg = `OB wake-up check: no entry for ${Math.floor(gapMin)} min at ${site.name}. Reply/log now.`;
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
    guardWhatsApp: guard ? `https://wa.me/${guard}?text=${encodeURIComponent(msg)}` : null,
    controlWhatsApp: control ? `https://wa.me/${control}?text=${encodeURIComponent(msg + " (unanswered risk)")}` : null,
  });
}
