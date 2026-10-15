import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildJobCardPdf } from "@/lib/modules/jobcard-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const internal = await requireProductApi("job-card-internal");
  const field = await requireProductApi("job-card-field");
  if ("error" in internal && "error" in field) return internal.error;
  const organizationId = "error" in internal ? field.session!.organizationId : internal.session.organizationId;
  const card = await db.jobCard.findFirst({
    where: { id: (await params).id, organizationId },
  });
  if (!card) return notFound();
  if (card.mode === "field" && "error" in field) return field.error;
  if (card.mode !== "field" && "error" in internal) return internal.error;
  const pdf = await buildJobCardPdf(card);
  return pdfResponse(pdf.bytes, `${pdf.documentNumber} ${card.title}`);
}
