import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { pdfResponse } from "@/lib/modules/common";
import { buildRegisterPdf } from "@/lib/modules/nearmiss-pdf";
import { SLUG } from "@/lib/modules/nearmiss-server";
import { fmtDate, nextDocumentNumber } from "@/lib/modules/pdf-kit";

const isKey = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Register + trend summary PDF for ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). */
export async function GET(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!isKey(from) || !isKey(to) || from > to) {
    return NextResponse.json({ error: "Choose a valid date range" }, { status: 400 });
  }
  const start = new Date(`${from}T00:00:00+02:00`);
  const end = new Date(`${to}T23:59:59.999+02:00`);
  const orgId = gate.session.organizationId;
  const reports = await db.nearMissReport.findMany({
    where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "asc" },
  });
  const label = `${fmtDate(start)} to ${fmtDate(end)}`;
  const bytes = await buildRegisterPdf(orgId, reports, label, await nextDocumentNumber(orgId, "NMR"));
  return pdfResponse(bytes, `Near-miss register ${from} to ${to}`);
}
