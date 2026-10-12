import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET() {
  const gate = await requireProductApi("digital-ob");
  if ("error" in gate) return gate.error;
  const sites = await db.obSite.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { entries: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  return NextResponse.json({ sites });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("digital-ob");
  if ("error" in gate) return gate.error;
  const body = z.object({
    name: z.string().min(2),
    wakeMinutes: z.number().int().positive().optional(),
    guardPhone: z.string().optional(),
    controlPhone: z.string().optional(),
  }).parse(await req.json());
  const site = await db.obSite.create({
    data: {
      organizationId: gate.session.organizationId,
      name: body.name,
      wakeMinutes: body.wakeMinutes ?? 60,
      guardPhone: body.guardPhone,
      controlPhone: body.controlPhone,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ site, publicUrl: `${appUrl}/p/ob/${site.publicToken}` });
}
