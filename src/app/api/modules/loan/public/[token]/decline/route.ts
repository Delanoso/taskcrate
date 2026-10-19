import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { alertCompany } from "@/lib/email";
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
  const title = `${r.employeeName} declined ${r.reference ?? "an AOD"}`;
  await alertCompany(r.organizationId, {
    productSlug: SLUG,
    title,
    body: body.data.reason.slice(0, 300),
    kind: "aod_declined",
    subject: title,
    lines: [body.data.reason, "Nothing will be deducted until a new acknowledgement is signed."],
  });
  return NextResponse.json({ ok: true });
}
