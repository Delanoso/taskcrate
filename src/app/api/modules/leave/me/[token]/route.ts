import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { selfServiceRequest } from "@/lib/modules/leave-request-schema";
import { companyName, createLeaveRequest, employeeWithBalances, getLeaveSettings } from "@/lib/modules/leave-server";

async function findEmployee(token: string) {
  if (token.length < 10) return null;
  return db.leaveEmployee.findFirst({ where: { publicToken: token, active: true }, select: { id: true, organizationId: true } });
}

/** Employee's personal leave page: balances and history. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const found = await findEmployee((await params).token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const settings = await getLeaveSettings(found.organizationId);
  const emp = await employeeWithBalances(found.id, found.organizationId, settings.workDays);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const requests = await db.leaveRequest.findMany({
    where: { employeeId: emp.id },
    orderBy: { startDate: "desc" },
    take: 50,
    select: {
      id: true, leaveType: true, startDate: true, endDate: true, days: true, status: true,
      reason: true, decisionNote: true, createdAt: true,
    },
  });
  return NextResponse.json({
    companyName: await companyName(emp.organizationId),
    workDays: settings.workDays,
    employee: { fullName: emp.fullName, level: emp.level, annualDays: emp.annualDays },
    balances: emp.balances,
    requests,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const found = await findEmployee((await params).token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = selfServiceRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const result = await createLeaveRequest({ organizationId: found.organizationId, employeeId: found.id, ...parsed.data });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, status: result.request.status });
}

/** Employee withdraws a request that has not been decided yet. */
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const found = await findEmployee((await params).token);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = z.object({ requestId: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { count } = await db.leaveRequest.updateMany({
    where: { id: parsed.data.requestId, employeeId: found.id, status: "pending" },
    data: { status: "cancelled", cancelledAt: new Date(), decidedBy: "Employee" },
  });
  if (!count) return NextResponse.json({ error: "Only pending requests can be withdrawn. Ask your manager to cancel approved leave." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
