import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildItemHistoryPdf } from "@/lib/modules/equipment-pdf";
import { requireEquipmentApi } from "@/lib/modules/equipment-server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const item = await db.equipmentItem.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!item) return notFound();
  const [issues, logs] = await Promise.all([
    db.equipmentIssue.findMany({ where: { itemId: item.id }, orderBy: { createdAt: "asc" } }),
    db.equipmentCustodyLog.findMany({ where: { itemId: item.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const bytes = await buildItemHistoryPdf(item, issues, logs, item.assetTag ?? item.name);
  return pdfResponse(bytes, `Asset card ${item.assetTag ?? item.name}`);
}
