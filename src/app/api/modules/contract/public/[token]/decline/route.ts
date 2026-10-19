import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { alertCompany } from "@/lib/email";
import { notFound, parseBody } from "@/lib/modules/common";
import { OPEN, SLUG, clientIp, normStatus } from "@/lib/modules/contract-server";

const input = z.object({ reason: z.string().trim().min(3, "Tell us why you are not signing").max(1000) });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const d = token.length < 10 ? null : await db.contractDocument.findUnique({ where: { publicToken: token } });
  if (!d) return notFound();
  if (!OPEN.includes(normStatus(d.status))) return NextResponse.json({ error: "This document can no longer be declined." }, { status: 409 });
  const body = await parseBody(req, input);
  if ("error" in body) return body.error;
  await db.contractDocument.update({
    where: { id: d.id },
    data: { status: "declined", declinedAt: new Date(), declineReason: body.data.reason, viewIp: d.viewIp ?? clientIp(req), viewedAt: d.viewedAt ?? new Date() },
  });
  const title = `${d.employeeName ?? "An employee"} declined ${d.title}`;
  await alertCompany(d.organizationId, {
    productSlug: SLUG,
    title,
    body: body.data.reason,
    kind: "contract_declined",
    subject: title,
    lines: [body.data.reason, "Open the contract and decide whether to change it or withdraw it."],
  });
  return NextResponse.json({ ok: true });
}
