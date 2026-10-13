import { db } from "@/lib/db";
import {
  computeBalances,
  countLeaveDays,
  fmtDays,
  fmtLeaveRange,
  fromDateKey,
  isTracked,
  leaveTypeLabel,
  waPhone,
  type LeaveTypeKey,
} from "@/lib/modules/leave-policy";

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
export const employeeLink = (token: string) => `${appUrl()}/p/leave/me/${token}`;

export async function getLeaveSettings(organizationId: string) {
  const s = await db.leaveSettings.findUnique({ where: { organizationId } });
  return { workDays: s?.workDays ?? "12345", allowNegative: s?.allowNegative ?? false };
}

export async function companyName(organizationId: string) {
  const org = await db.organization.findUnique({ where: { id: organizationId }, include: { branding: true } });
  return org?.branding?.displayName ?? org?.name ?? "Your company";
}

const balanceInclude = {
  requests: { select: { leaveType: true, status: true, startDate: true, days: true } },
  adjustments: { select: { leaveType: true, days: true, createdAt: true } },
} as const;

export async function employeeWithBalances(id: string, organizationId: string, workDays: string) {
  const emp = await db.leaveEmployee.findFirst({ where: { id, organizationId }, include: balanceInclude });
  if (!emp) return null;
  const { requests, adjustments, ...rest } = emp;
  return { ...rest, balances: computeBalances(emp, requests, adjustments, workDays) };
}

export async function allEmployeesWithBalances(organizationId: string, workDays: string) {
  const list = await db.leaveEmployee.findMany({
    where: { organizationId },
    include: { requests: balanceInclude.requests, adjustments: { orderBy: { createdAt: "desc" } } },
    orderBy: [{ active: "desc" }, { fullName: "asc" }],
  });
  return list.map(({ requests, ...rest }) => ({
    ...rest,
    balances: computeBalances(rest, requests, rest.adjustments, workDays),
  }));
}

type NewRequest = {
  organizationId: string;
  employeeId: string;
  leaveType: LeaveTypeKey;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  reason?: string | null;
  /** Staff name when an admin records leave — it is approved straight away. */
  capturedBy?: string;
};

/** Validates and creates a leave request, applying level rules and balance checks. */
export async function createLeaveRequest(input: NewRequest) {
  const fail = (error: string, status = 400) => ({ error, status }) as const;
  const settings = await getLeaveSettings(input.organizationId);
  const emp = await employeeWithBalances(input.employeeId, input.organizationId, settings.workDays);
  if (!emp) return fail("Employee not found", 404);
  if (!emp.active) return fail("This employee is no longer active on the leave register.");
  if (input.endDate < input.startDate) return fail("The end date is before the start date.");

  const halfDay = !!input.halfDay && input.startDate === input.endDate;
  let days = countLeaveDays(input.startDate, input.endDate, settings.workDays);
  if (days === 0) return fail("Those dates are all weekends or public holidays — no leave days needed.");
  if (halfDay) days = 0.5;

  const start = fromDateKey(input.startDate);
  const end = fromDateKey(input.endDate);
  const overlap = await db.leaveRequest.findFirst({
    where: {
      employeeId: emp.id,
      status: { in: ["pending", "approved", "auto_approved"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) return fail(`There is already leave booked from ${fmtLeaveRange(overlap.startDate, overlap.endDate)}.`);

  const balance = isTracked(input.leaveType) ? emp.balances[input.leaveType] : null;
  const shortBy = balance ? days - (balance.available - balance.pending) : 0;
  if (!input.capturedBy && balance && shortBy > 0 && !settings.allowNegative) {
    return fail(
      `Not enough ${leaveTypeLabel(input.leaveType).toLowerCase()}: you have ${fmtDays(Math.max(0, balance.available - balance.pending))} available (after pending requests) and this needs ${fmtDays(days)}.`,
    );
  }

  let status = "approved";
  if (!input.capturedBy) {
    const rule = await db.leaveLevelRule.findUnique({
      where: { organizationId_levelName: { organizationId: input.organizationId, levelName: emp.level } },
    });
    const blackouts = rule ? (JSON.parse(rule.blackoutJson) as string[]) : [];
    const hitsBlackout = blackouts.some((d) => d >= input.startDate && d <= input.endDate);
    status = "pending";
    if (rule?.mode === "auto" && shortBy <= 0) status = "auto_approved";
    if (rule?.mode === "block" || hitsBlackout) status = "blocked";
  }

  const request = await db.leaveRequest.create({
    data: {
      organizationId: input.organizationId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeLevel: emp.level,
      leaveType: input.leaveType,
      startDate: start,
      endDate: end,
      days,
      reason: input.reason || null,
      status,
      capturedBy: input.capturedBy ?? null,
      decidedAt: status === "pending" ? null : new Date(),
      decidedBy: input.capturedBy ?? (status === "pending" ? null : "Level rule"),
    },
  });

  if (status === "pending") {
    await db.notification.create({
      data: {
        organizationId: input.organizationId,
        productSlug: "leave-planner",
        title: "Leave approval required",
        body: `${emp.fullName}: ${leaveTypeLabel(input.leaveType)}, ${fmtLeaveRange(start, end)} (${fmtDays(days)})`,
        dueAt: start,
      },
    });
  }
  return { request, employee: emp };
}

type DecisionRequest = {
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number | null;
  status: string;
  decisionNote: string | null;
};

/** wa.me link with a prefilled message telling the employee what happened to their leave. */
export async function leaveWhatsAppUrl(
  organizationId: string,
  req: DecisionRequest,
  employee: { id: string; fullName: string; phone: string | null; publicToken: string } | null,
  event: "decision" | "cancelled",
) {
  if (!employee) return null;
  const settings = await getLeaveSettings(organizationId);
  const fresh = await employeeWithBalances(employee.id, organizationId, settings.workDays);
  const company = await companyName(organizationId);
  const first = employee.fullName.split(/\s+/)[0];
  const what = `${leaveTypeLabel(req.leaveType).toLowerCase()} for ${fmtLeaveRange(req.startDate, req.endDate)}${req.days ? ` (${fmtDays(req.days)})` : ""}`;

  const outcome =
    event === "cancelled"
      ? `Your ${what} has been CANCELLED.${req.days && isTracked(req.leaveType) ? ` The days have been added back to your balance.` : ""}`
      : req.status === "rejected"
        ? `Your ${what} has been DECLINED.`
        : `Your ${what} has been APPROVED.`;

  const lines = [`Hi ${first},`, "", outcome];
  if (req.decisionNote) lines.push(`Note: ${req.decisionNote}`);
  if (fresh && isTracked(req.leaveType)) {
    lines.push("", `${leaveTypeLabel(req.leaveType)} balance: ${fmtDays(fresh.balances[req.leaveType].available)}`);
  }
  lines.push("", `View your leave: ${employeeLink(employee.publicToken)}`, "", `– ${company}`);
  return `https://wa.me/${waPhone(employee.phone)}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export async function staffName(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { fullName: true } });
  return user?.fullName ?? "Staff";
}
