import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/client";
import { requireProductApi } from "@/lib/modules/api-guard";
import { auditSummary } from "@/lib/modules/ohsa-audit-items";
import { findAudit, parsePhotos, removeAuditPhoto } from "@/lib/modules/ohsa-server";

const SLUG = "ohsa-mock-auditor";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const audit = await db.ohsaAudit.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
    include: { answers: true },
  });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { answers, answersJson: _legacy, ...rest } = audit;
  return NextResponse.json({
    audit: {
      ...rest,
      summary: auditSummary(answers),
      answers: answers.map((a) => ({
        questionId: a.questionId,
        answer: a.answer,
        note: a.note,
        photos: parsePhotos(a.photosJson),
      })),
    },
  });
}

/** Complete (locks answers, sets score) or reopen an audit. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const parsed = z.object({ action: z.enum(["complete", "reopen"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const audit = await findAudit((await params).id, gate.session.organizationId);
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.action === "reopen") {
    await db.ohsaAudit.update({ where: { id: audit.id }, data: { status: "in_progress", completedAt: null } });
    return NextResponse.json({ ok: true });
  }
  const answers = await db.ohsaAuditAnswer.findMany({ where: { auditId: audit.id }, select: { questionId: true, answer: true } });
  const summary = auditSummary(answers);
  if (summary.answered === 0) {
    return NextResponse.json({ error: "Answer at least one question before completing the audit." }, { status: 400 });
  }
  await db.ohsaAudit.update({
    where: { id: audit.id },
    data: { status: "completed", completedAt: new Date(), score: summary.compliance },
  });
  return NextResponse.json({ ok: true, summary });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can delete audits." }, { status: 403 });
  }
  const audit = await db.ohsaAudit.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
    include: { answers: { select: { photosJson: true } } },
  });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.ohsaAudit.delete({ where: { id: audit.id } });
  await Promise.all(
    audit.answers.flatMap((a) => parsePhotos(a.photosJson)).map((u) => removeAuditPhoto(u, audit.organizationId)),
  );
  return NextResponse.json({ ok: true });
}
