import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildNoticePdf, buildOutcomePdf } from "@/lib/modules/discipline-pdf";
import { SLUG, serializeCase } from "@/lib/modules/discipline-server";

/** ?doc=notice (hearing notice) or ?doc=outcome (warning / outcome letter). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const c = await db.disciplineEntry.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!c) return notFound();
  const kind = new URL(req.url).searchParams.get("doc");
  const s = serializeCase(c);
  if (kind === "notice") {
    if (!c.hearingAt) return NextResponse.json({ error: "No hearing has been scheduled" }, { status: 400 });
    return pdfResponse(await buildNoticePdf(c), `${s.reference} Notice of hearing - ${c.employeeName}`);
  }
  if (c.stage === "pending") return NextResponse.json({ error: "No outcome has been recorded yet" }, { status: 400 });
  return pdfResponse(await buildOutcomePdf(c), `${s.reference} ${s.documentTitle} - ${c.employeeName}`);
}
