import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { companyName, notFound, parseBody } from "@/lib/modules/common";
import { RIGHTS } from "@/lib/modules/discipline-options";
import { SLUG, saveSignature, serializeCase } from "@/lib/modules/discipline-server";

async function load(token: string) {
  if (token.length < 16) return null;
  return db.disciplineEntry.findUnique({ where: { signToken: token } });
}

/** What the employee sees from their WhatsApp link: the notice or the outcome, nothing internal. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await load((await params).token);
  if (!c || c.status === "withdrawn") return notFound();
  const s = serializeCase(c);
  const stage = c.status === "hearing" ? "notice" : c.status === "issued" || c.status === "finalised" ? "outcome" : null;
  if (!stage) return notFound();
  return NextResponse.json({
    company: await companyName(c.organizationId),
    stage,
    reference: s.reference,
    employeeName: c.employeeName,
    offenceLabel: s.offenceLabel,
    charge: c.offence,
    incidentAt: s.incidentAt,
    location: c.location,
    hearing: c.hearingAt ? { at: s.hearingAt, venue: c.hearingVenue, chairperson: c.chairperson } : null,
    rights: RIGHTS,
    noticeAcknowledgedAt: s.noticeAckAt,
    documentTitle: s.documentTitle,
    finding: c.finding,
    sanctionLabel: s.sanctionLabel,
    sanction: c.stage,
    sanctionDate: s.sanctionDate,
    validUntil: s.validUntil,
    reasons: c.outcomeReasons,
    issuedBy: c.issuedBy,
    signedAt: c.refusedToSign ? null : s.employeeSignedAt,
    refusedToSign: c.refusedToSign,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await load((await params).token);
  if (!c || c.status === "withdrawn") return notFound();
  const body = await parseBody(
    req,
    z.object({
      kind: z.enum(["notice", "outcome"]),
      signature: z.string().regex(/^data:image\/png;base64,/, "Please sign in the box").max(1_500_000),
      comment: z.string().trim().max(2000).nullable().optional(),
    }),
  );
  if ("error" in body) return body.error;
  const b = body.data;
  const sig = () => saveSignature(b.signature, c.organizationId);

  if (b.kind === "notice") {
    if (c.status !== "hearing") return NextResponse.json({ error: "This notice no longer needs a signature." }, { status: 409 });
    if (c.noticeAckAt) return NextResponse.json({ error: "You have already acknowledged this notice." }, { status: 409 });
    await db.disciplineEntry.update({ where: { id: c.id }, data: { noticeAckAt: new Date(), noticeAckSignature: await sig() } });
  } else {
    if (c.status !== "issued") return NextResponse.json({ error: "This document has already been signed." }, { status: 409 });
    await db.disciplineEntry.update({
      where: { id: c.id },
      data: { status: "finalised", employeeSignature: await sig(), employeeSignedAt: new Date(), employeeComment: b.comment || null },
    });
  }
  await db.notification.create({
    data: {
      organizationId: c.organizationId,
      productSlug: SLUG,
      title: `${c.employeeName} signed the ${b.kind === "notice" ? "hearing notice" : serializeCase(c).documentTitle.toLowerCase()}`,
      body: serializeCase(c).reference,
    },
  });
  return NextResponse.json({ ok: true });
}
