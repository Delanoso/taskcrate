import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, parseBody, removeUpload, staffName } from "@/lib/modules/common";
import { saveDataUrlUpload } from "@/lib/uploads";
import { FOLDER, OPEN, SLUG, newToken, normStatus, serializeDetail, serializeDoc, storeSignedPdf } from "@/lib/modules/contract-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";

const signature = z.string().regex(/^data:image\/png;base64,/, "Please sign in the box").max(1_500_000);
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("countersign"), name: z.string().trim().min(2, "Enter your name").max(120), signature }),
  z.object({ action: z.literal("void"), reason: z.string().trim().min(3, "Give a reason").max(500) }),
  z.object({ action: z.literal("remind") }),
  z.object({ action: z.literal("reissue") }),
]);

const load = (id: string, organizationId: string) =>
  db.contractDocument.findFirst({ where: { id, organizationId }, include: { template: { select: { name: true } } } });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const d = await load((await params).id, gate.session.organizationId);
  if (!d) return notFound();
  return NextResponse.json({ document: serializeDetail(d) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const d = await load((await params).id, orgId);
  if (!d) return notFound();
  const body = await parseBody(req, action);
  if ("error" in body) return body.error;
  const b = body.data;
  const status = normStatus(d.status);

  if (b.action === "countersign") {
    const denied = managersOnly(gate.access, "countersign documents");
    if (denied) return denied;
    if (status !== "awaiting_countersign") return NextResponse.json({ error: "This document is not waiting for a countersignature." }, { status: 409 });
    const url = await saveDataUrlUpload(b.signature, `${FOLDER}/${orgId}`);
    const updated = await db.contractDocument.update({
      where: { id: d.id },
      data: { status: "completed", countersignName: b.name, countersignUrl: url, countersignedAt: new Date() },
    });
    await storeSignedPdf(updated);
  } else if (b.action === "void") {
    if (!OPEN.includes(status) && status !== "awaiting_countersign") return NextResponse.json({ error: "Only unsigned or uncountersigned documents can be voided." }, { status: 409 });
    await db.contractDocument.update({ where: { id: d.id }, data: { status: "voided", voidedAt: new Date(), voidReason: b.reason } });
  } else if (b.action === "remind") {
    if (!OPEN.includes(status)) return NextResponse.json({ error: "Nothing to remind about." }, { status: 409 });
    await db.contractDocument.update({ where: { id: d.id }, data: { lastRemindedAt: new Date(), reminderCount: { increment: 1 } } });
  } else {
    if (status !== "declined" && status !== "voided") return NextResponse.json({ error: "Only declined or voided documents can be sent again." }, { status: 409 });
    const copy = await db.contractDocument.create({
      data: {
        organizationId: orgId,
        templateId: d.templateId,
        reference: await nextDocumentNumber(orgId, "CS"),
        title: d.title,
        bodyText: d.bodyText,
        kind: d.kind,
        sourceFileUrl: d.sourceFileUrl,
        pageCount: d.pageCount,
        contentHash: d.contentHash,
        publicToken: newToken(),
        employeeName: d.employeeName,
        employeePhone: d.employeePhone,
        employeeEmail: d.employeeEmail,
        employeeNumber: d.employeeNumber,
        jobTitle: d.jobTitle,
        dueDate: d.dueDate && d.dueDate > new Date() ? d.dueDate : null,
        requireCountersign: d.requireCountersign,
        sentBy: await staffName(gate.session.userId),
      },
      include: { template: { select: { name: true } } },
    });
    return NextResponse.json({ document: serializeDetail(copy), created: serializeDoc(copy) });
  }
  return NextResponse.json({ document: serializeDetail((await load(d.id, orgId))!) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "delete documents");
  if (denied) return denied;
  const d = await load((await params).id, gate.session.organizationId);
  if (!d) return notFound();
  await db.contractDocument.delete({ where: { id: d.id } });
  await Promise.all(
    [d.signatureUrl, d.countersignUrl, d.signedPdfUrl].filter((u): u is string => !!u).map((u) => removeUpload(u, FOLDER, d.organizationId)),
  );
  return NextResponse.json({ ok: true });
}
