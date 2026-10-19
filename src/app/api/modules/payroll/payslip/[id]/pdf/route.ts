import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { PayrollError } from "@/lib/modules/payroll";
import { buildPayslipPdf } from "@/lib/modules/payroll-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("payroll");
  if ("error" in gate) return gate.error;
  try {
    const pdf = await buildPayslipPdf(gate.session.organizationId, (await params).id);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof PayrollError) return notFound();
    throw error;
  }
}
