import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/client";
import { requireProductApi } from "@/lib/modules/api-guard";
import { isDateKey } from "@/lib/modules/leave-policy";
import { allEmployeesWithBalances, appUrl, getLeaveSettings } from "@/lib/modules/leave-server";

const SLUG = "leave-planner";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const organizationId = gate.session.organizationId;
  const settings = await getLeaveSettings(organizationId);
  const [rules, requests, employees] = await Promise.all([
    db.leaveLevelRule.findMany({ where: { organizationId }, orderBy: { levelName: "asc" } }),
    db.leaveRequest.findMany({
      where: { organizationId },
      orderBy: { startDate: "desc" },
      take: 1000,
      include: { employee: { select: { phone: true, publicToken: true } } },
    }),
    allEmployeesWithBalances(organizationId, settings.workDays),
  ]);
  return NextResponse.json({
    rules: rules.map((r) => ({ ...r, blackoutDates: JSON.parse(r.blackoutJson) as string[] })),
    requests,
    employees,
    settings,
    appUrl: appUrl(),
    requestUrl: `${appUrl()}/p/leave/${organizationId}`,
    canDelete: gate.access.role !== OrgRole.MEMBER,
  });
}

/** Create or update a level rule. */
export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const parsed = z
    .object({
      levelName: z.string().trim().min(1, "Enter a level name").max(60),
      mode: z.enum(["approve", "auto", "block"]),
      blackoutDates: z.array(z.string().refine(isDateKey, "Invalid date")).max(366).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const { levelName, mode, blackoutDates } = parsed.data;
  const organizationId = gate.session.organizationId;
  const blackoutJson = JSON.stringify([...new Set(blackoutDates ?? [])].sort());
  const rule = await db.leaveLevelRule.upsert({
    where: { organizationId_levelName: { organizationId, levelName } },
    create: { organizationId, levelName, mode, blackoutJson },
    update: { mode, blackoutJson },
  });
  return NextResponse.json({ rule });
}

/** Company leave settings. */
export async function PUT(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const parsed = z
    .object({
      workDays: z.string().regex(/^[1-7]{1,7}$/, "Pick at least one working day"),
      allowNegative: z.boolean(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const workDays = [...new Set(parsed.data.workDays)].sort().join("");
  const organizationId = gate.session.organizationId;
  const settings = await db.leaveSettings.upsert({
    where: { organizationId },
    create: { organizationId, workDays, allowNegative: parsed.data.allowNegative },
    update: { workDays, allowNegative: parsed.data.allowNegative },
  });
  return NextResponse.json({ settings });
}

/** Remove a level rule: ?level=<name> */
export async function DELETE(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can remove level rules." }, { status: 403 });
  }
  const levelName = new URL(req.url).searchParams.get("level") ?? "";
  await db.leaveLevelRule.deleteMany({ where: { organizationId: gate.session.organizationId, levelName } });
  return NextResponse.json({ ok: true });
}
