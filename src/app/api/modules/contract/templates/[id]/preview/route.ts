import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { companyName, notFound, pdfResponse } from "@/lib/modules/common";
import { fillMerge } from "@/lib/modules/contract-library";
import { SLUG, buildContractPdf } from "@/lib/modules/contract-server";
import type { ContractDocument } from "@/generated/prisma/client";

/** PDF preview of a text template with sample merge values. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const t = await db.contractTemplate.findFirst({ where: { id: (await params).id, organizationId: orgId } });
  if (!t || t.kind !== "text") return notFound();
  const company = await companyName(orgId);
  const now = new Date();
  const fake = {
    id: "preview",
    organizationId: orgId,
    reference: "PREVIEW",
    title: t.name,
    bodyText: fillMerge(t.bodyText, { company, employee_name: "Sample Employee", job_title: "Job title", employee_number: "E000" }),
    kind: "text",
    requireCountersign: t.requireCountersign,
    createdAt: now,
    employeeName: "Sample Employee",
  } as unknown as ContractDocument;
  return pdfResponse(await buildContractPdf(fake), `Preview - ${t.name}`);
}
