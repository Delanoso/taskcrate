import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companyName, notFound } from "@/lib/modules/common";
import { statusLabel, typeLabel } from "@/lib/modules/nearmiss-options";

/** What an anonymous reporter may see about their own report: progress and feedback only. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  if (token.length < 16) return notFound();
  const r = await db.nearMissReport.findUnique({ where: { trackingToken: token } });
  if (!r) return notFound();
  return NextResponse.json({
    companyName: await companyName(r.organizationId),
    reference: r.reference,
    type: typeLabel(r.reportType),
    status: r.status,
    statusLabel: statusLabel(r.status),
    description: r.description,
    feedback: r.feedback,
    actionPlanned: r.status !== "open" && !!r.correctiveAction,
    createdAt: r.createdAt.toISOString(),
    triagedAt: r.triagedAt?.toISOString() ?? null,
    closedAt: r.closedAt?.toISOString() ?? null,
  });
}
