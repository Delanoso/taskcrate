import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { contractPdfBytes } from "@/lib/modules/contract-server";

/** The employee's own signed copy. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const d = token.length < 10 ? null : await db.contractDocument.findUnique({ where: { publicToken: token } });
  if (!d || !d.signedAt || d.status === "voided") return notFound();
  return pdfResponse(await contractPdfBytes(d), `${d.reference ?? "contract"} - ${d.title} (signed)`);
}
