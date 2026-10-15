import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildObPdf } from "@/lib/modules/ob-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("digital-ob");
  if ("error" in gate) return gate.error;
  const site = await db.obSite.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  if (!site) return notFound();
  const pdf = await buildObPdf(site);
  return pdfResponse(pdf.bytes, `${pdf.documentNumber} ${site.name}`);
}
