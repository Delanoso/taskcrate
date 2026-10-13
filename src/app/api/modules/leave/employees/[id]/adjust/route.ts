import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/client";
import { requireProductApi } from "@/lib/modules/api-guard";
import { staffName } from "@/lib/modules/leave-server";

const SLUG = "leave-planner";

/** Manual balance correction: positive days add, negative days remove. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can adjust balances." }, { status: 403 });
  }
  const { id } = await params;
  const emp = await db.leaveEmployee.findFirst({ where: { id, organizationId: gate.session.organizationId } });
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = z
    .object({
      leaveType: z.enum(["annual", "sick", "family"]),
      days: z.coerce.number().min(-365).max(365).refine((n) => n !== 0, "Enter the number of days to add or remove"),
      note: z.string().trim().min(2, "Give a reason for the adjustment").max(300),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const adjustment = await db.leaveAdjustment.create({
    data: { employeeId: id, ...parsed.data, createdBy: await staffName(gate.session.userId) },
  });
  return NextResponse.json({ adjustment });
}

/** Undo an adjustment: ?adjustmentId= */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can adjust balances." }, { status: 403 });
  }
  const { id } = await params;
  const adjustmentId = new URL(req.url).searchParams.get("adjustmentId") ?? "";
  const { count } = await db.leaveAdjustment.deleteMany({
    where: { id: adjustmentId, employeeId: id, employee: { organizationId: gate.session.organizationId } },
  });
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
