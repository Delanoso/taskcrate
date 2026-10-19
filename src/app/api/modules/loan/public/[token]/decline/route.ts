import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody } from "@/lib/modules/common";
import { SLUG } from "@/lib/modules/aod-server";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const r = token.length < 10 ? null : await db.loanDeductibleRecord.findUnique({ where: { publicToken: token } });
  if (!r) return notFound();
  if (r.status !== "pending") return NextResponse.json({ error: "This AOD can no longer be declined." }, { status: 409 });
  const body = await parseBody(req, z.object({ reason: z.string().trim().min(3, "Tell the company why").max(1000) }));
  if ("error" in body) return body.error;
  await db.loanDeductibleRecord.update({ where: { id: r.id }, data: { status: "declined", declinedAt: new Date(), declineReason: body.data.reason } });
  await db.notification.create({
    data: { organizationId: r.organizationId, productSlug: SLUG, title: `${r.employeeName} declined ${r.reference ?? "an AOD"}`, body: body.data.reason.slice(0, 300) },
  });
  return NextResponse.json({ ok: true });
}
