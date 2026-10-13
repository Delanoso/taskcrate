import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, staffName } from "@/lib/modules/common";
import { SLUG, readBank } from "@/lib/modules/onboard-server";

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
  let log: { by: string; at: string }[] = [];
  try {
    log = JSON.parse(p.bankViewLog);
  } catch {}
  log.push({ by: await staffName(gate.session.userId), at: new Date().toISOString() });
  await db.onboardingPacket.update({ where: { id: p.id }, data: { bankViewLog: JSON.stringify(log.slice(-100)) } });
  return NextResponse.json({ bank, views: log });
}
