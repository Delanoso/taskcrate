import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProductApi } from "@/lib/modules/api-guard";
import { LEAVE_TYPE_KEYS, isDateKey } from "@/lib/modules/leave-policy";
import { createLeaveRequest, leaveWhatsAppUrl, staffName } from "@/lib/modules/leave-server";

/** Admin records leave for an employee — approved immediately and deducted from the balance. */
export async function POST(req: Request) {
  const gate = await requireProductApi("leave-planner");
  if ("error" in gate) return gate.error;
  const parsed = z
    .object({
      employeeId: z.string().min(1, "Pick an employee"),
      leaveType: z.enum(LEAVE_TYPE_KEYS),
      startDate: z.string().refine(isDateKey, "Pick a start date"),
      endDate: z.string().refine(isDateKey, "Pick an end date"),
      halfDay: z.boolean().optional(),
      reason: z.string().trim().max(500).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const organizationId = gate.session.organizationId;
  const result = await createLeaveRequest({
    organizationId,
    ...parsed.data,
    capturedBy: await staffName(gate.session.userId),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const whatsAppUrl = await leaveWhatsAppUrl(organizationId, result.request, result.employee, "decision");
  return NextResponse.json({ request: result.request, whatsAppUrl });
}
