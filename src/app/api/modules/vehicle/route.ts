import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET() {
  const gate = await requireProductApi("pretrip-handover");
  if ("error" in gate) return gate.error;
  const items = await db.vehicle.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { trips: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("pretrip-handover");
  if ("error" in gate) return gate.error;
  const body = z.object({ name: z.string().min(2), regNumber: z.string().min(2) }).parse(await req.json());
  const item = await db.vehicle.create({
    data: {
      organizationId: gate.session.organizationId,
      name: body.name,
      regNumber: body.regNumber,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/vehicle/${item.publicToken}` });
}
