import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { auditSummary } from "@/lib/modules/ohsa-audit-items";

export async function GET() {
  const gate = await requireProductApi("ohsa-mock-auditor");
  if ("error" in gate) return gate.error;
  const audits = await db.ohsaAudit.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { answers: { select: { questionId: true, answer: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    items: audits.map(({ answers, answersJson, ...a }) => ({
      ...a,
      legacy: answers.length === 0 && answersJson !== "[]",
      summary: auditSummary(answers),
    })),
  });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("ohsa-mock-auditor");
  if ("error" in gate) return gate.error;
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Enter the site or area being audited."),
      monthLabel: z.string().trim().min(2, "Enter the audit period, e.g. Oct 2026."),
      auditorName: z.string().trim().max(120).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid form" }, { status: 400 });
  }
  const audit = await db.ohsaAudit.create({
    data: {
      organizationId: gate.session.organizationId,
      title: parsed.data.title,
      monthLabel: parsed.data.monthLabel,
      auditorName: parsed.data.auditorName || null,
      status: "in_progress",
    },
  });
  return NextResponse.json({ audit });
}
