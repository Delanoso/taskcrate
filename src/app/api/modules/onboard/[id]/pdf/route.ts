import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, pdfResponse, staffName } from "@/lib/modules/common";
import { buildInfoSheet } from "@/lib/modules/onboard-pdf";
import { SLUG, logBankView } from "@/lib/modules/onboard-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";

/** Information sheet including full bank details: managers only, logged like a reveal. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "download employee information sheets");
  if (denied) return denied;
  const p = await db.onboardingPacket.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId }, include: { documents: true } });
  if (!p) return notFound();
  if (p.bankJson) await logBankView(p, `${await staffName(gate.session.userId)} (PDF)`);
  const bytes = await buildInfoSheet(p, await nextDocumentNumber(p.organizationId, "EMP"));
  return pdfResponse(bytes, `Employee information - ${p.employeeName}`);
}
