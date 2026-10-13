import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildCustodyPdf } from "@/lib/modules/equipment-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const issue = token.length < 16 ? null : await db.equipmentIssue.findUnique({ where: { publicToken: token } });
  if (!issue) return notFound();
  const rows = await db.equipmentIssue.findMany({ where: { batchId: issue.batchId, status: { not: "cancelled" } }, include: { item: true }, orderBy: { createdAt: "asc" } });
  if (!rows.length || !rows.some((r) => r.signedAt)) return notFound();
  return pdfResponse(await buildCustodyPdf(rows), `Custody ${issue.documentNumber}`);
}
