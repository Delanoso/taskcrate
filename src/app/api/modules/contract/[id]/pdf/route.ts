import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { SLUG, contractPdfBytes } from "@/lib/modules/contract-server";

/** Signed copy once signed; before that a preview with empty signature boxes. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const d = await db.contractDocument.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!d) return notFound();
  const bytes = await contractPdfBytes(d);
  return pdfResponse(bytes, `${d.reference ?? "contract"} - ${d.title} - ${d.employeeName ?? ""}`);
}
