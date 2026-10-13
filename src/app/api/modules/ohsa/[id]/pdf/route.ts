import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildAuditPdf } from "@/lib/modules/ohsa-pdf";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("ohsa-mock-auditor");
  if ("error" in gate) return gate.error;
  const audit = await db.ohsaAudit.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
    include: { answers: true },
  });
  if (!audit) return new NextResponse("Not found", { status: 404 });

  let documentNumber = audit.documentNumber;
  if (!documentNumber) {
    documentNumber = await nextDocumentNumber(audit.organizationId, "AUD");
    await db.ohsaAudit.update({ where: { id: audit.id }, data: { documentNumber } });
  }
  const bytes = await buildAuditPdf({ ...audit, documentNumber });
  const name = `${documentNumber} ${audit.title}`.replace(/[^\w .()-]+/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
