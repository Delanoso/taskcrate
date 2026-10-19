import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { managersOnly, notFound, parseBody, photoSchema, staffName } from "@/lib/modules/common";
import { FOLDER, hasLedger, logEvent, raiseDeductible, requireEquipmentApi, serializeIssue, signatureSchema } from "@/lib/modules/equipment-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { saveDataUrlUpload } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string }> };

async function batchOf(batchId: string) {
  const rows = await db.equipmentIssue.findMany({ where: { batchId }, include: { item: true }, orderBy: { createdAt: "asc" } });
  return rows.map((x) => ({ ...serializeIssue(x), itemName: x.item.name, assetTag: x.item.assetTag }));
}

export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const issue = await db.equipmentIssue.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!issue) return notFound();
  return NextResponse.json({ issue: serializeIssue(issue), batch: await batchOf(issue.batchId) });
}

const patchInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sign_now"), signerName: z.string().trim().min(3, "Type the employee's full name").max(120), signature: signatureSchema, agree: z.literal(true, { error: "The employee must accept the custody terms" }) }),
  z.object({ action: z.literal("remind") }),
  z.object({ action: z.literal("extend"), dueBackAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3, "Say why it is being cancelled").max(500) }),
  z.object({
    action: z.literal("lost"),
    note: z.string().trim().min(3, "Describe what happened (and the SAPS case number for theft)").max(1000),
    amount: z.number().min(0).max(10_000_000).nullable().optional(),
    raiseDeductible: z.boolean().default(false),
    photo: photoSchema.nullable().optional(),
  }),
]);

export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const issue = await db.equipmentIssue.findFirst({ where: { id: (await params).id, organizationId: orgId }, include: { item: true } });
  if (!issue) return notFound();
  const body = await parseBody(req, patchInput);
  if ("error" in body) return body.error;
  const b = body.data;
  const by = await staffName(gate.session.userId);
  const open = issue.status === "awaiting_signature" || issue.status === "active";
  if (!open) return NextResponse.json({ error: "This custody record is already closed." }, { status: 409 });

  if (b.action === "sign_now") {
    if (issue.status !== "awaiting_signature") return NextResponse.json({ error: "Already signed." }, { status: 409 });
    const url = await saveDataUrlUpload(b.signature, `${FOLDER}/${orgId}`);
    const pending = await db.equipmentIssue.findMany({ where: { batchId: issue.batchId, status: "awaiting_signature" } });
    await db.equipmentIssue.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { status: "active", signMethod: "in_person", signerName: b.signerName, signatureUrl: url, signedAt: new Date() },
    });
    for (const p of pending) await logEvent({ organizationId: orgId, itemId: p.itemId, issueId: p.id, employeeName: p.employeeName, action: "signed", by, note: "Signed in person" });
  } else if (b.action === "remind") {
    await db.equipmentIssue.updateMany({
      where: { batchId: issue.batchId, status: { in: ["awaiting_signature", "active"] } },
      data: { lastRemindedAt: new Date(), reminderCount: { increment: 1 } },
    });
  } else if (b.action === "extend") {
    await db.equipmentIssue.update({ where: { id: issue.id }, data: { dueBackAt: b.dueBackAt ? new Date(`${b.dueBackAt}T17:00:00+02:00`) : null } });
    await logEvent({ organizationId: orgId, itemId: issue.itemId, issueId: issue.id, employeeName: issue.employeeName, action: "note", by, note: b.dueBackAt ? `Return date changed to ${b.dueBackAt}` : "Return date removed" });
  } else if (b.action === "cancel") {
    if (issue.status === "active") {
      const denied = managersOnly(gate.access, "cancel a signed custody record");
      if (denied) return denied;
    }
    await db.equipmentIssue.update({ where: { id: issue.id }, data: { status: "cancelled", cancelReason: b.reason, returnedAt: new Date(), receivedBy: by } });
    await db.equipmentItem.update({ where: { id: issue.itemId }, data: { status: "available" } });
    await logEvent({ organizationId: orgId, itemId: issue.itemId, issueId: issue.id, employeeName: issue.employeeName, action: "cancelled", by, note: b.reason });
  } else {
    const denied = managersOnly(gate.access, "report equipment lost");
    if (denied) return denied;
    if (b.raiseDeductible && !(await hasLedger(orgId))) return NextResponse.json({ error: "Your company does not subscribe to the AOD Book." }, { status: 400 });
    if (b.raiseDeductible && !b.amount) return NextResponse.json({ error: "Enter the amount to recover." }, { status: 400 });
    const photoUrl = b.photo ? await saveDataUrlUpload(b.photo, `${FOLDER}/${orgId}`) : null;
    const updated = await db.equipmentIssue.update({
      where: { id: issue.id },
      data: {
        status: "lost",
        outcome: "lost",
        returnedAt: new Date(),
        receivedBy: by,
        damageNotes: b.note,
        repairCost: b.amount ?? issue.item.value,
        photosJson: JSON.stringify(photoUrl ? [photoUrl] : []),
        employeePresent: false,
        returnBatchId: issue.id,
        handbackNumber: await nextDocumentNumber(orgId, "EQH"),
      },
    });
    await db.equipmentItem.update({ where: { id: issue.itemId }, data: { status: "lost" } });
    if (b.raiseDeductible && b.amount) {
      const deductibleId = await raiseDeductible(updated, issue.item, b.amount, `reported lost: ${b.note}`, photoUrl);
      await db.equipmentIssue.update({ where: { id: issue.id }, data: { deductibleId } });
    }
    await logEvent({ organizationId: orgId, itemId: issue.itemId, issueId: issue.id, employeeName: issue.employeeName, action: "lost", by, note: b.note, photoUrl });
  }

  const fresh = await db.equipmentIssue.findUniqueOrThrow({ where: { id: issue.id } });
  return NextResponse.json({ issue: serializeIssue(fresh), batch: await batchOf(issue.batchId) });
}
