import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildCustodyPdf, buildHandbackPdf } from "@/lib/modules/equipment-pdf";
import { requireEquipmentApi } from "@/lib/modules/equipment-server";

/** ?type=handback for the inspection report of the return this item was part of; otherwise the custody document. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const issue = await db.equipmentIssue.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!issue) return notFound();
  if (new URL(req.url).searchParams.get("type") === "handback") {
    if (!issue.returnBatchId) return notFound();
    const rows = await db.equipmentIssue.findMany({ where: { returnBatchId: issue.returnBatchId }, include: { item: true }, orderBy: { createdAt: "asc" } });
    return pdfResponse(await buildHandbackPdf(rows), `Handback ${issue.handbackNumber} ${issue.employeeName}`);
  }
  const all = await db.equipmentIssue.findMany({ where: { batchId: issue.batchId }, include: { item: true }, orderBy: { createdAt: "asc" } });
  const live = all.filter((x) => x.status !== "cancelled");
  return pdfResponse(await buildCustodyPdf(live.length ? live : all), `Custody ${issue.documentNumber} ${issue.employeeName}`);
}
