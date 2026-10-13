import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { buildHistoryPdf } from "@/lib/modules/discipline-pdf";
import { SLUG, employeeKey } from "@/lib/modules/discipline-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";

/** ?employee=<employeeKey>: full disciplinary record for one person. */
export async function GET(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const key = new URL(req.url).searchParams.get("employee") ?? "";
  const orgId = gate.session.organizationId;
  const all = await db.disciplineEntry.findMany({ where: { organizationId: orgId }, orderBy: { incidentAt: "asc" } });
  const cases = all.filter((c) => employeeKey(c) === key);
  if (!cases.length) return notFound();
  const bytes = await buildHistoryPdf(orgId, cases, await nextDocumentNumber(orgId, "DR"));
  return pdfResponse(bytes, `Disciplinary record - ${cases[0].employeeName}`);
}
