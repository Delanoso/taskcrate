import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

const DEFAULT_CHECKS = [
  "Guards / covers in place",
  "Emergency stop functional",
  "No visible leaks / damage",
  "PPE available at station",
  "Work area clear of hazards",
];

export async function GET() {
  const gate = await requireProductApi("asset-precheck");
  if ("error" in gate) return gate.error;
  const items = await db.asset.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { checks: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("asset-precheck");
  if ("error" in gate) return gate.error;
  const body = z
    .object({ name: z.string().min(2), assetCode: z.string().min(1) })
    .parse(await req.json());
  const item = await db.asset.create({
    data: {
      organizationId: gate.session.organizationId,
      name: body.name,
      assetCode: body.assetCode,
      checklistJson: JSON.stringify(DEFAULT_CHECKS),
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/asset/${item.publicToken}` });
}
