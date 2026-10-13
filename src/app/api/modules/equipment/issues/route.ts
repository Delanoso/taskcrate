import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, staffName } from "@/lib/modules/common";
import { FOLDER, issueInput, logEvent, newBatch, newToken, requireEquipmentApi, serializeIssue } from "@/lib/modules/equipment-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { saveDataUrlUpload } from "@/lib/uploads";

/** Signs out one or more items to a person under one custody document. */
export async function POST(req: Request) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const body = await parseBody(req, issueInput);
  if ("error" in body) return body.error;
  const b = body.data;

  const ids = [...new Set(b.itemIds)];
  const items = await db.equipmentItem.findMany({ where: { id: { in: ids }, organizationId: orgId } });
  if (items.length !== ids.length) return NextResponse.json({ error: "One of the items no longer exists." }, { status: 404 });
  const busy = items.filter((i) => i.status !== "available");
  if (busy.length) return NextResponse.json({ error: `Not in store: ${busy.map((i) => i.name).join(", ")}` }, { status: 409 });

  const inPerson = b.method === "in_person";
  if (inPerson) {
    if (!b.signature) return NextResponse.json({ error: "The employee must sign on screen." }, { status: 400 });
    if (!b.agree) return NextResponse.json({ error: "The employee must accept the custody terms." }, { status: 400 });
    if (!b.signerName || b.signerName.length < 3) return NextResponse.json({ error: "Type the employee's full name under the signature." }, { status: 400 });
  }

  const issuedBy = await staffName(gate.session.userId);
  const documentNumber = await nextDocumentNumber(orgId, "EQI");
  const batchId = newBatch();
  const now = new Date();
  const signatureUrl = inPerson ? await saveDataUrlUpload(b.signature!, `${FOLDER}/${orgId}`) : null;
  const dueBackAt = b.dueBackAt ? new Date(`${b.dueBackAt}T17:00:00+02:00`) : null;

  const created = [];
  for (const item of items) {
    const conditionOut = b.conditions[item.id] ?? item.condition;
    const issue = await db.equipmentIssue.create({
      data: {
        organizationId: orgId,
        itemId: item.id,
        batchId,
        documentNumber,
        publicToken: newToken(),
        employeeName: b.employeeName,
        employeeNumber: b.employeeNumber,
        employeePhone: b.employeePhone,
        dueBackAt,
        conditionOut,
        accessories: b.accessories,
        notesOut: b.notesOut,
        issuedBy,
        status: inPerson ? "active" : "awaiting_signature",
        signMethod: b.method,
        signerName: inPerson ? b.signerName : null,
        signatureUrl,
        signedAt: inPerson ? now : null,
      },
    });
    await db.equipmentItem.update({ where: { id: item.id }, data: { status: "issued", condition: conditionOut } });
    await logEvent({ organizationId: orgId, itemId: item.id, issueId: issue.id, employeeName: b.employeeName, action: "issue", by: issuedBy, note: inPerson ? "Signed in person" : "Signing link sent" });
    created.push(serializeIssue(issue));
  }
  return NextResponse.json({ issues: created, documentNumber });
}
