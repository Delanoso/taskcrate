import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildAodPdf } from "@/lib/modules/aod-pdf";
import { SLUG } from "@/lib/modules/aod-server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const item = await db.loanDeductibleRecord.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId }, include: { payments: true } });
  if (!item) return notFound();
  return pdfResponse(await buildAodPdf(item), `${item.reference ?? "AOD"} ${item.employeeName}`);
}
