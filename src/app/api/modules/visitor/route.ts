import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
export async function GET() {
  const gate = await requireProductApi("site-visitor");
  if ("error" in gate) return gate.error;
  let site = await db.visitorSite.findFirst({
    where: { organizationId: gate.session.organizationId },
    include: { visitors: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!site) {
    site = await db.visitorSite.create({
      data: {
        organizationId: gate.session.organizationId,
        name: "Main Gate",
        protocolText:
          "Welcome. Follow all site safety rules, wear PPE where required, sign out when leaving, and report hazards immediately to reception.",
      },
      include: { visitors: true },
    });
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({
    site,
    publicUrl: `${appUrl}/p/visitor/${site.publicToken}`,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireProductApi("site-visitor");
  if ("error" in gate) return gate.error;
  const body = z
    .object({ protocolText: z.string().min(10), name: z.string().min(2).optional() })
    .parse(await req.json());
  const site = await db.visitorSite.findFirst({
    where: { organizationId: gate.session.organizationId },
  });
  if (!site) return NextResponse.json({ error: "Missing site" }, { status: 404 });
  const updated = await db.visitorSite.update({
    where: { id: site.id },
    data: { protocolText: body.protocolText, name: body.name ?? site.name },
  });
  return NextResponse.json({ site: updated });
}
