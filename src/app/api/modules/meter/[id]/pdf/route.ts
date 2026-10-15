import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildMeterLogPdf } from "@/lib/modules/meter-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("meter-variance");
  if ("error" in gate) return gate.error;
  const site = await db.meterSite.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
    include: { readings: { orderBy: { createdAt: "asc" } } },
  });
  if (!site) return notFound();
  const pdf = await buildMeterLogPdf(site);
  return pdfResponse(pdf.bytes, `${pdf.documentNumber} ${site.name}`);
}
