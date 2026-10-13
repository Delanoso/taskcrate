import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { phoneKey } from "@/lib/modules/leave-policy";
import { selfServiceRequest } from "@/lib/modules/leave-request-schema";
import { companyName, createLeaveRequest, getLeaveSettings } from "@/lib/modules/leave-server";

export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const settings = await getLeaveSettings(orgId);
  return NextResponse.json({ companyName: await companyName(orgId), workDays: settings.workDays });
}

/** Company-wide request link: the employee identifies themselves with the phone number on the leave register. */
export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = selfServiceRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const key = phoneKey(typeof body?.phone === "string" ? body.phone : "");
  if (key.length < 9) return NextResponse.json({ error: "Enter your cellphone number." }, { status: 400 });

  const employees = await db.leaveEmployee.findMany({
    where: { organizationId: orgId, active: true, phone: { not: null } },
    select: { id: true, phone: true },
  });
  const matches = employees.filter((e) => phoneKey(e.phone) === key);
  if (matches.length !== 1) {
    return NextResponse.json(
      { error: "That number isn't on the leave register. Ask your manager to add it, or use the personal leave link they sent you." },
      { status: 404 },
    );
  }
  const result = await createLeaveRequest({ organizationId: orgId, employeeId: matches[0].id, ...parsed.data });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, status: result.request.status, days: result.request.days, name: result.employee.fullName });
}
