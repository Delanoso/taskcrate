import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: { branding: true, leaveRules: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    companyName: org.branding?.displayName ?? org.name,
    levels: org.leaveRules.map((r) => r.levelName),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: { leaveRules: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    employeeName: z.string().min(2),
    employeeLevel: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional(),
  }).parse(await req.json());
  const rule = org.leaveRules.find((r) => r.levelName === body.employeeLevel);
  const blackouts = rule ? (JSON.parse(rule.blackoutJson) as string[]) : [];
  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  const hitsBlackout = blackouts.some((d) => {
    const x = new Date(d);
    return x >= start && x <= end;
  });
  let status = "pending";
  if (!rule || rule.mode === "approve") status = "pending";
  if (rule?.mode === "auto") status = hitsBlackout ? "blocked" : "auto_approved";
  if (rule?.mode === "block" || hitsBlackout) status = "blocked";
  const request = await db.leaveRequest.create({
    data: {
      organizationId: orgId,
      employeeName: body.employeeName,
      employeeLevel: body.employeeLevel,
      startDate: start,
      endDate: end,
      reason: body.reason,
      status,
    },
  });
  if (status === "pending") {
    await db.notification.create({
      data: {
        organizationId: orgId,
        productSlug: "leave-planner",
        title: "Leave approval required",
        body: `${body.employeeName} (${body.employeeLevel}) ${body.startDate} → ${body.endDate}`,
        dueAt: start,
      },
    });
  }
  return NextResponse.json({ ok: true, status: request.status, id: request.id });
}
