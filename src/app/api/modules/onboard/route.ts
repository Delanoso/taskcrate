import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET() {
  const gate = await requireProductApi("onboard-docs");
  if ("error" in gate) return gate.error;
  const items = await db.onboardingPacket.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("onboard-docs");
  if ("error" in gate) return gate.error;
  const body = z.object({
    employeeName: z.string().min(2),
    employeePhone: z.string().optional(),
  }).parse(await req.json());
  const item = await db.onboardingPacket.create({
    data: {
      organizationId: gate.session.organizationId,
      employeeName: body.employeeName,
      employeePhone: body.employeePhone,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/onboard/${item.publicToken}` });
}
