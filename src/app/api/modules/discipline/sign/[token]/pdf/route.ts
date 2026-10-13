import { db } from "@/lib/db";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildNoticePdf, buildOutcomePdf } from "@/lib/modules/discipline-pdf";
import { serializeCase } from "@/lib/modules/discipline-server";

/** The employee's own copy of the notice or outcome letter. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  if (token.length < 16) return notFound();
  const c = await db.disciplineEntry.findUnique({ where: { signToken: token } });
  if (!c || c.status === "withdrawn") return notFound();
  const s = serializeCase(c);
  if (new URL(req.url).searchParams.get("doc") === "notice") {
    if (!c.hearingAt) return notFound();
    return pdfResponse(await buildNoticePdf(c), `${s.reference} Notice of hearing`);
  }
  if (c.stage === "pending") return notFound();
  return pdfResponse(await buildOutcomePdf(c), `${s.reference} ${s.documentTitle}`);
}
