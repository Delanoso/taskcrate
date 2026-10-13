import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET() {
  const gate = await requireProductApi("fit-for-duty");
  if ("error" in gate) return gate.error;
  const sites = await db.fitForDutySite.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
    include: { checks: { orderBy: { createdAt: "desc" }, take: 40 } },
  });
  return NextResponse.json({ sites });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("fit-for-duty");
  if ("error" in gate) return gate.error;
  const body = z.object({ name: z.string().min(2) }).parse(await req.json());
  const site = await db.fitForDutySite.create({
    data: { organizationId: gate.session.organizationId, name: body.name },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ site, publicUrl: `${appUrl}/p/fit/${site.publicToken}` });
}
