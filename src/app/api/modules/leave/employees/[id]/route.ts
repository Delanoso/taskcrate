import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/client";
import { requireProductApi } from "@/lib/modules/api-guard";
import { employeeData, employeeInput } from "@/lib/modules/leave-employee-schema";

const SLUG = "leave-planner";

/** Edit an employee, or set { active } to archive / restore. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const existing = await db.leaveEmployee.findFirst({ where: { id, organizationId: gate.session.organizationId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const active = z.object({ active: z.boolean() }).safeParse(body);
  if (active.success && Object.keys(body).length === 1) {
    const employee = await db.leaveEmployee.update({ where: { id }, data: { active: active.data.active } });
    return NextResponse.json({ employee });
  }
  const parsed = employeeInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const data = employeeData(parsed.data);
  const employee = await db.leaveEmployee.update({ where: { id }, data });
  if (data.fullName !== existing.fullName || data.level !== existing.level) {
    await db.leaveRequest.updateMany({ where: { employeeId: id }, data: { employeeName: data.fullName, employeeLevel: data.level } });
  }
  return NextResponse.json({ employee });
}

/** Remove an employee. Their leave history is kept but no longer linked to a balance. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can delete employees." }, { status: 403 });
  }
  const { id } = await params;
  const { count } = await db.leaveEmployee.deleteMany({ where: { id, organizationId: gate.session.organizationId } });
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
