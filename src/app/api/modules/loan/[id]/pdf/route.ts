import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildLoanPdf } from "@/lib/modules/loan-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("loan-deductible-ledger");
  if ("error" in gate) return gate.error;
  const item = await db.loanDeductibleRecord.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
  });
  if (!item) return notFound();
  const pdf = await buildLoanPdf(item);
  return pdfResponse(pdf.bytes, `${pdf.documentNumber} ${item.employeeName}`);
}
