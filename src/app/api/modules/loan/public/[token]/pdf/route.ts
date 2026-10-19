import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildAodPdf } from "@/lib/modules/aod-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const r = token.length < 10 ? null : await db.loanDeductibleRecord.findUnique({ where: { publicToken: token }, include: { payments: true } });
  if (!r || !r.signedAt) return notFound();
  return pdfResponse(await buildAodPdf(r), `${r.reference ?? "AOD"} ${r.employeeName}`);
}
