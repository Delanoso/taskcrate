import type { EquipmentCustodyLog, EquipmentIssue, EquipmentItem } from "@/generated/prisma/client";
import { createBrandedDocument, fit, fmtDate, fmtDateTime, MARGIN, PAGE_W, safe } from "@/lib/modules/pdf-kit";
import { CATEGORIES, CHECKLIST, CONDITIONS, CUSTODY_TERMS, ISSUE_STATUS, ITEM_STATUS, OUTCOMES, label, money } from "@/lib/modules/equipment-options";
import { jsonList } from "@/lib/modules/common";
import { readChecklist } from "@/lib/modules/equipment-server";

type Doc = Awaited<ReturnType<typeof createBrandedDocument>>;
type IssueWithItem = EquipmentIssue & { item: EquipmentItem };

function table(doc: Doc, cols: { label: string; w: number }[], rows: string[][]) {
  const flex = cols.findIndex((c) => c.w === 0);
  if (flex >= 0) cols[flex].w = PAGE_W - MARGIN * 2 - cols.reduce((a, c) => a + c.w, 0);
  const draw = (cells: string[], head = false) => {
    doc.ensure(16);
    let x = MARGIN;
    cells.forEach((c, i) => {
      const f = head ? doc.bold : doc.font;
      doc.page.drawText(fit(safe(c), f, 8.5, cols[i].w - 6), { x, y: doc.y, size: 8.5, font: f, color: head ? doc.primary : doc.ink });
      x += cols[i].w;
    });
    doc.y -= 14;
  };
  draw(cols.map((c) => c.label), true);
  for (const r of rows) draw(r);
  doc.y -= 4;
}

const tagOf = (i: EquipmentItem) => i.assetTag ?? "-";

export async function buildCustodyPdf(issues: IssueWithItem[]) {
  const first = issues[0];
  const doc = await createBrandedDocument({ organizationId: first.organizationId, title: `Equipment Custody - ${first.employeeName}`, documentNumber: first.documentNumber });

  doc.heading("Issued to");
  doc.field("Employee", first.employeeName);
  doc.field("Employee number", first.employeeNumber);
  doc.field("Cellphone", first.employeePhone);
  doc.field("Issued", fmtDateTime(first.createdAt));
  doc.field("Issued by", first.issuedBy);
  doc.field("Return by", first.dueBackAt ? fmtDate(first.dueBackAt) : "On request / end of employment");

  doc.heading(`Equipment (${issues.length} item${issues.length === 1 ? "" : "s"})`);
  table(
    doc,
    [{ label: "Asset tag", w: 70 }, { label: "Item", w: 0 }, { label: "Serial no.", w: 95 }, { label: "Condition", w: 70 }, { label: "Value", w: 70 }],
    issues.map((x) => [tagOf(x.item), x.item.name, x.item.serialNumber ?? "-", label(CONDITIONS, x.conditionOut), money(x.item.value)]),
  );
  const total = issues.reduce((a, x) => a + (x.item.value ?? 0), 0);
  if (total > 0) doc.field("Total replacement value", money(total));
  if (first.accessories) doc.field("Accessories", first.accessories);
  if (first.notesOut) doc.field("Notes", first.notesOut);

  doc.heading("Custody terms");
  CUSTODY_TERMS.forEach((t, i) => {
    doc.paragraph(`${i + 1}.  ${t}`, { size: 9 });
    doc.y -= 2;
  });
  doc.y -= 6;
  doc.ensure(150);
  await doc.signatures([
    first.signedAt
      ? { label: "Received by (employee)", name: first.signerName ?? first.employeeName, date: first.signedAt, url: first.signatureUrl }
      : { label: "Received by (employee)", name: first.employeeName, note: first.status === "cancelled" ? "Cancelled" : "Awaiting signature" },
    { label: "Issued by", name: first.issuedBy, date: first.createdAt },
  ]);
  if (first.signedAt) {
    const how = first.signMethod === "link" ? `on their own device via a secure link${first.signIp ? ` (IP ${first.signIp})` : ""}` : "in person on the issuer's device";
    doc.paragraph(`Signed electronically ${how} on ${fmtDateTime(first.signedAt)}.`, { size: 8, color: doc.muted });
  }
  return doc.finish();
}

export async function buildHandbackPdf(issues: IssueWithItem[]) {
  const first = issues[0];
  const doc = await createBrandedDocument({
    organizationId: first.organizationId,
    title: `Equipment Handback - ${first.employeeName}`,
    documentNumber: first.handbackNumber ?? first.documentNumber,
  });

  doc.heading("Returned by");
  doc.field("Employee", first.employeeName);
  doc.field("Employee number", first.employeeNumber);
  doc.field("Returned", first.returnedAt ? fmtDateTime(first.returnedAt) : null);
  doc.field("Inspected by", first.receivedBy);
  doc.field("Custody document", first.documentNumber);

  doc.heading("Summary");
  table(
    doc,
    [{ label: "Asset tag", w: 70 }, { label: "Item", w: 0 }, { label: "Out", w: 60 }, { label: "In", w: 60 }, { label: "Outcome", w: 110 }],
    issues.map((x) => [tagOf(x.item), x.item.name, label(CONDITIONS, x.conditionOut), label(CONDITIONS, x.conditionIn), label(OUTCOMES, x.outcome)]),
  );
  const cost = issues.reduce((a, x) => a + (x.repairCost ?? 0), 0);
  if (cost > 0) doc.field("Estimated repair / replacement", money(cost));

  for (const x of issues) {
    doc.heading(`${x.item.name}${x.item.assetTag ? ` (${x.item.assetTag})` : ""}`, 10);
    doc.field("Issued", `${fmtDate(x.createdAt)} in ${label(CONDITIONS, x.conditionOut).toLowerCase()} condition`);
    const checks = readChecklist(x.checklistJson);
    for (const c of CHECKLIST) doc.field(c.label, x.outcome === "lost" ? "n/a" : checks[c.key] ? "Yes" : "No", 260);
    if (x.damageNotes) doc.field("Damage / findings", x.damageNotes);
    if (x.repairCost) doc.field("Estimated cost", money(x.repairCost));
    doc.field("Outcome", label(OUTCOMES, x.outcome));
    if (x.deductibleId) doc.field("Deductible", "Raised in the Loan & Deductible Ledger for the employee's written consent");
    const photos = jsonList(x.photosJson);
    if (photos.length) {
      doc.y -= 4;
      await doc.imageRow(photos, 110);
    }
  }

  doc.heading("Acknowledgement");
  doc.paragraph(
    first.employeePresent
      ? "The employee was present at the inspection and confirms that the condition recorded above is correct."
      : "The employee was not present at the inspection. A copy of this report must be given to the employee, who may respond in writing.",
    { size: 9 },
  );
  doc.y -= 6;
  await doc.signatures([
    first.employeePresent
      ? { label: "Employee", name: first.returnSignerName ?? first.employeeName, date: first.returnedAt, url: first.returnSignatureUrl }
      : { label: "Employee", name: first.employeeName, note: "Not present" },
    { label: "Inspected by", name: first.receivedBy, date: first.returnedAt, url: first.inspectorSignature },
  ]);
  return doc.finish();
}

export async function buildItemHistoryPdf(item: EquipmentItem, issues: EquipmentIssue[], logs: EquipmentCustodyLog[], documentNumber: string) {
  const doc = await createBrandedDocument({ organizationId: item.organizationId, title: `Asset Card - ${item.name}`, documentNumber });
  doc.heading("Asset");
  doc.field("Item", item.name);
  doc.field("Asset tag", item.assetTag);
  doc.field("Category", label(CATEGORIES, item.category));
  doc.field("Serial number", item.serialNumber);
  doc.field("Replacement value", money(item.value));
  doc.field("Condition", label(CONDITIONS, item.condition));
  doc.field("Status", ITEM_STATUS[item.status as keyof typeof ITEM_STATUS] ?? item.status);
  doc.field("Location", item.location);
  doc.field("Added", fmtDate(item.createdAt));
  if (item.notes) doc.field("Notes", item.notes);

  doc.heading("Custody history");
  if (!issues.length && !logs.length) doc.paragraph("Never issued.", { color: doc.muted });
  if (issues.length) {
    table(
      doc,
      [{ label: "Document", w: 70 }, { label: "Holder", w: 0 }, { label: "Out", w: 62 }, { label: "Back", w: 62 }, { label: "Condition", w: 80 }, { label: "Status", w: 85 }],
      issues.map((x) => [
        x.documentNumber,
        x.employeeName,
        fmtDate(x.createdAt),
        x.returnedAt ? fmtDate(x.returnedAt) : "-",
        `${label(CONDITIONS, x.conditionOut)}${x.conditionIn ? ` > ${label(CONDITIONS, x.conditionIn)}` : ""}`,
        ISSUE_STATUS[x.status as keyof typeof ISSUE_STATUS] ?? x.status,
      ]),
    );
  }
  const legacy = logs.filter((l) => !l.issueId && (l.action === "issue" || l.action === "handback"));
  if (legacy.length) {
    doc.paragraph("Earlier entries", { font: doc.bold, size: 9 });
    for (const l of legacy) doc.paragraph(`${fmtDateTime(l.createdAt)}  ${l.action === "issue" ? "Issued to" : "Returned by"} ${l.employeeName}${l.conditionNotes ? ` - ${l.conditionNotes}` : ""}`, { size: 9 });
  }
  return doc.finish();
}
