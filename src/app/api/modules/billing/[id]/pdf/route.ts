import { BillingError } from "@/lib/modules/billing";
import { buildBillingPdf } from "@/lib/modules/billing-pdf";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("quotations");
  if ("error" in gate) return gate.error;
  try {
    const pdf = await buildBillingPdf(gate.session.organizationId, (await params).id);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof BillingError) return notFound();
    throw error;
  }
}
