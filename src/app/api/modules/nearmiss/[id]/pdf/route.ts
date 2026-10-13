import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildReportPdf } from "@/lib/modules/nearmiss-pdf";
import { SLUG } from "@/lib/modules/nearmiss-server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const report = await db.nearMissReport.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!report) return notFound();
  const bytes = await buildReportPdf(report);
  return pdfResponse(bytes, `${report.reference ?? "Near miss"} report`);
}
