import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, pdfResponse, staffName } from "@/lib/modules/common";
import { buildInfoSheet } from "@/lib/modules/onboard-pdf";
import { SLUG } from "@/lib/modules/onboard-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";

/** Information sheet including full bank details: managers only, logged like a reveal. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "download employee information sheets");
  if (denied) return denied;
  const p = await db.onboardingPacket.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId }, include: { documents: true } });
  if (!p) return notFound();
  if (p.bankJson) {
    let log: { by: string; at: string }[] = [];
    try {
      log = JSON.parse(p.bankViewLog);
    } catch {}
    log.push({ by: `${await staffName(gate.session.userId)} (PDF)`, at: new Date().toISOString() });
    await db.onboardingPacket.update({ where: { id: p.id }, data: { bankViewLog: JSON.stringify(log.slice(-100)) } });
  }
  const bytes = await buildInfoSheet(p, await nextDocumentNumber(p.organizationId, "EMP"));
  return pdfResponse(bytes, `Employee information - ${p.employeeName}`);
}
