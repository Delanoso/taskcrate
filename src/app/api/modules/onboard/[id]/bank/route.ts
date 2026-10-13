import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, staffName } from "@/lib/modules/common";
import { SLUG, logBankView, readBank } from "@/lib/modules/onboard-server";

/** Reveals the decrypted bank details to a manager and records who looked. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "view bank details");
  if (denied) return denied;
  const p = await db.onboardingPacket.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!p) return notFound();
  const bank = readBank(p.bankJson);
  if (!bank) return NextResponse.json({ error: "No bank details captured yet." }, { status: 404 });
  const views = await logBankView(p, await staffName(gate.session.userId));
  return NextResponse.json({ bank, views });
}
