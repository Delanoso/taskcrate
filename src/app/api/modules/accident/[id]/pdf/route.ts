import { AccidentError } from "@/lib/modules/accident";
import { buildAccidentPdf } from "@/lib/modules/accident-pdf";
import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound, pdfResponse } from "@/lib/modules/common";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("accident-report");
  if ("error" in gate) return gate.error;
  try {
    const pdf = await buildAccidentPdf(gate.session.organizationId, (await params).id);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof AccidentError) return notFound();
    throw error;
  }
}
