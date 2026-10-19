import { BillingError } from "@/lib/modules/billing";
import { buildBillingPdf } from "@/lib/modules/billing-pdf";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const doc = await db.billingDocument.findFirst({ where: { publicToken: (await params).token } });
  if (!doc) return notFound();
  try {
    const pdf = await buildBillingPdf(doc.organizationId, doc.id);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof BillingError) return notFound();
    throw error;
  }
}
