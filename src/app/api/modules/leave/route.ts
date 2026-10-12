import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET() {
  const gate = await requireProductApi("leave-planner");
  if ("error" in gate) return gate.error;
  const [rules, requests] = await Promise.all([
    db.leaveLevelRule.findMany({ where: { organizationId: gate.session.organizationId } }),
    db.leaveRequest.findMany({
      where: { organizationId: gate.session.organizationId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({
    rules,
    requests,
    requestUrl: `${appUrl}/p/leave/${gate.session.organizationId}`,
  });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("leave-planner");
  if ("error" in gate) return gate.error;
  const body = z.object({
    levelName: z.string().min(1),
    mode: z.enum(["approve", "auto", "block"]),
    blackoutDates: z.array(z.string()).optional(),
  }).parse(await req.json());
  const rule = await db.leaveLevelRule.upsert({
    where: {
      organizationId_levelName: {
        organizationId: gate.session.organizationId,
        levelName: body.levelName,
      },
    },
    create: {
      organizationId: gate.session.organizationId,
      levelName: body.levelName,
      mode: body.mode,
      blackoutJson: JSON.stringify(body.blackoutDates ?? []),
    },
    update: {
      mode: body.mode,
      blackoutJson: JSON.stringify(body.blackoutDates ?? []),
    },
  });
  return NextResponse.json({ rule });
}

export async function PATCH(req: Request) {
  const gate = await requireProductApi("leave-planner");
  if ("error" in gate) return gate.error;
  const body = z.object({
    id: z.string(),
    status: z.enum(["approved", "rejected"]),
  }).parse(await req.json());
  const existing = await db.leaveRequest.findFirst({
    where: { id: body.id, organizationId: gate.session.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.leaveRequest.update({
    where: { id: body.id },
    data: { status: body.status },
  });
  return NextResponse.json({ request: updated });
}
