import { requireBillingApi } from "@/lib/billing-guard";
import { buildInvoicePdf } from "@/lib/billing-invoice";
import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireBillingApi();
  if ("error" in gate) return gate.error;
  const p = await db.billingPayment.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!p) return notFound();
  const org = await db.organization.findUnique({ where: { id: p.organizationId }, select: { name: true } });
  const intent = p.intentId ? await db.paymentIntent.findUnique({ where: { id: p.intentId }, select: { email: true } }) : null;
  return pdfResponse(await buildInvoicePdf(p, { name: org?.name ?? "Customer", email: intent?.email ?? null }), p.invoiceNumber);
}
