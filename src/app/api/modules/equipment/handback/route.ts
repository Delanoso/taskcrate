import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessProduct } from "@/lib/rbac";
import { parseBody, staffName } from "@/lib/modules/common";
import { OUTCOMES } from "@/lib/modules/equipment-options";
import { FOLDER, HANDBACK, handbackInput, hasLedger, logEvent, newBatch, raiseDeductible, requireEquipmentApi, serializeIssue } from "@/lib/modules/equipment-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { saveDataUrlUpload } from "@/lib/uploads";

/** Checks one person's items back in after inspection, under one handback number. */
export async function POST(req: Request) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const body = await parseBody(req, handbackInput);
  if ("error" in body) return body.error;
  const b = body.data;

  const ids = [...new Set(b.issueIds)];
  const issues = await db.equipmentIssue.findMany({ where: { id: { in: ids }, organizationId: orgId }, include: { item: true } });
  if (issues.length !== ids.length) return NextResponse.json({ error: "One of the items was not found." }, { status: 404 });
  if (issues.some((x) => x.status !== "active" && x.status !== "awaiting_signature")) return NextResponse.json({ error: "One of the items has already been checked in." }, { status: 409 });
  const people = new Set(issues.map((x) => x.employeeName.trim().toLowerCase()));
  if (people.size > 1) return NextResponse.json({ error: "Check in one person's items at a time." }, { status: 400 });
  if (issues.some((x) => !b.lines[x.id])) return NextResponse.json({ error: "Inspect every item before checking in." }, { status: 400 });
  if (b.employeePresent && (!b.returnSignature || !b.returnSignerName || b.returnSignerName.length < 3)) {
    return NextResponse.json({ error: "The employee must sign, or untick 'employee present'." }, { status: 400 });
  }

  const fullInspection = canAccessProduct(gate.access, HANDBACK);
  const lines = Object.values(b.lines);
  if (!fullInspection && lines.some((l) => l.photos.length || l.raiseDeductible)) {
    return NextResponse.json({ error: "Damage photos and deductibles need the Equipment Handback module." }, { status: 403 });
  }
  const wantsDeductible = lines.some((l) => l.raiseDeductible);
  if (wantsDeductible && !(await hasLedger(orgId))) return NextResponse.json({ error: "Your company does not subscribe to the Loan & Deductible Ledger." }, { status: 400 });
  if (lines.some((l) => l.raiseDeductible && !l.repairCost)) return NextResponse.json({ error: "Enter the cost for every deductible." }, { status: 400 });

  const receivedBy = await staffName(gate.session.userId);
  const handbackNumber = await nextDocumentNumber(orgId, "EQH");
  const returnBatchId = newBatch();
  const folder = `${FOLDER}/${orgId}`;
  const now = new Date();
  const inspectorSignature = await saveDataUrlUpload(b.inspectorSignature, folder);
  const returnSignatureUrl = b.employeePresent && b.returnSignature ? await saveDataUrlUpload(b.returnSignature, folder) : null;

  const out = [];
  for (const x of issues) {
    const line = b.lines[x.id];
    const photos: string[] = [];
    for (const p of line.photos) photos.push(await saveDataUrlUpload(p, folder));
    const outcome = OUTCOMES.find((o) => o.key === line.outcome)!;
    let updated = await db.equipmentIssue.update({
      where: { id: x.id },
      data: {
        status: line.outcome === "lost" ? "lost" : "returned",
        returnBatchId,
        handbackNumber,
        returnedAt: now,
        receivedBy,
        conditionIn: line.conditionIn,
        checklistJson: JSON.stringify(line.checklist),
        damageNotes: line.damageNotes,
        photosJson: JSON.stringify(photos),
        repairCost: line.repairCost ?? null,
        outcome: line.outcome,
        employeePresent: b.employeePresent,
        returnSignerName: b.employeePresent ? b.returnSignerName : null,
        returnSignatureUrl,
        inspectorSignature,
      },
    });
    await db.equipmentItem.update({
      where: { id: x.itemId },
      data: { status: outcome.itemStatus, condition: line.outcome === "lost" ? x.item.condition : line.conditionIn },
    });
    if (line.raiseDeductible && line.repairCost) {
      const reason = line.outcome === "lost" ? "not returned" : `damage found at handback${line.damageNotes ? `: ${line.damageNotes}` : ""}`;
      const deductibleId = await raiseDeductible(updated, x.item, line.repairCost, reason, photos[0] ?? null);
      updated = await db.equipmentIssue.update({ where: { id: x.id }, data: { deductibleId } });
    }
    await logEvent({
      organizationId: orgId,
      itemId: x.itemId,
      issueId: x.id,
      employeeName: x.employeeName,
      action: line.outcome === "lost" ? "lost" : "handback",
      by: receivedBy,
      note: [outcome.label, line.damageNotes].filter(Boolean).join(" - "),
      photoUrl: photos[0] ?? null,
    });
    out.push(serializeIssue(updated));
  }
  return NextResponse.json({ issues: out, handbackNumber });
}
