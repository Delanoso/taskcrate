import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildTripPdf } from "@/lib/modules/pretrip-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("pretrip-handover");
  if ("error" in gate) return gate.error;
  const vehicle = await db.vehicle.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
    include: { trips: { orderBy: { createdAt: "asc" } } },
  });
  if (!vehicle) return notFound();
  const pdf = await buildTripPdf(vehicle);
  return pdfResponse(pdf.bytes, `${pdf.documentNumber} ${vehicle.regNumber}`);
}
