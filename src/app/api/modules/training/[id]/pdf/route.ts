import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { TrainingError } from "@/lib/modules/training";
import { buildTrainingPdf } from "@/lib/modules/training-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("training-tickets");
  if ("error" in gate) return gate.error;
  try {
    const pdf = await buildTrainingPdf(gate.session.organizationId, (await params).id);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof TrainingError) return notFound();
    throw error;
  }
}