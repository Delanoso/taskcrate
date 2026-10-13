import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { companyName, notFound, parseBody, saDateKey } from "@/lib/modules/common";
import { saveDataUrlUpload } from "@/lib/uploads";
import { parseBlocks } from "@/lib/modules/contract-library";
import { FOLDER, OPEN, SLUG, clientIp, normStatus, storeSignedPdf } from "@/lib/modules/contract-server";

const find = (token: string) => (token.length < 10 ? null : db.contractDocument.findUnique({ where: { publicToken: token } }));

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  let d = await find((await params).token);
  if (!d) return notFound();
  if (d.status === "sent") {
    d = await db.contractDocument.update({ where: { id: d.id }, data: { status: "viewed", viewedAt: new Date(), viewIp: clientIp(req) } });
  }
  const status = normStatus(d.status);
  return NextResponse.json({
    company: await companyName(d.organizationId),
    reference: d.reference,
    title: d.title,
    kind: d.kind,
    blocks: d.kind === "text" && status !== "voided" ? parseBlocks(d.bodyText) : [],
    pageCount: d.pageCount,
    contentHash: d.contentHash,
    status,
    employeeName: d.employeeName,
    dueDate: d.dueDate ? saDateKey(d.dueDate) : null,
    signedAt: d.signedAt?.toISOString() ?? null,
    signerName: d.signerName ?? (d.signedAt ? d.employeeName : null),
    requireCountersign: d.requireCountersign,
    countersignedAt: d.countersignedAt?.toISOString() ?? null,
    declinedAt: d.declinedAt?.toISOString() ?? null,
  });
}

const signInput = z.object({
  signerName: z.string().trim().min(3, "Type your full name").max(120),
  idNumber: z.string().trim().max(30).nullable().optional(),
  agree: z.literal(true, { error: "Tick the box to confirm you have read and agree to the document" }),
  signature: z.string().regex(/^data:image\/png;base64,/, "Please sign in the box").max(1_500_000),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const d = await find((await params).token);
  if (!d) return notFound();
  const status = normStatus(d.status);
  if (!OPEN.includes(status)) {
    const msg = status === "voided" ? "This document has been withdrawn." : status === "declined" ? "You declined this document." : "This document has already been signed.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  const body = await parseBody(req, signInput);
  if ("error" in body) return body.error;
  const url = await saveDataUrlUpload(body.data.signature, `${FOLDER}/${d.organizationId}`);
  const now = new Date();
  const updated = await db.contractDocument.update({
    where: { id: d.id },
    data: {
      status: d.requireCountersign ? "awaiting_countersign" : "completed",
      signerName: body.data.signerName,
      signerIdNumber: body.data.idNumber || null,
      signatureUrl: url,
      signedAt: now,
      signIp: clientIp(req),
      signUserAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      viewedAt: d.viewedAt ?? now,
    },
  });
  await storeSignedPdf(updated);
  await db.notification.create({
    data: {
      organizationId: d.organizationId,
      productSlug: SLUG,
      title: `${body.data.signerName} signed ${d.title}`,
      body: d.requireCountersign ? `${d.reference ?? ""} needs your countersignature.`.trim() : `${d.reference ?? ""} is complete. The signed PDF is ready.`.trim(),
    },
  });
  return NextResponse.json({ ok: true });
}
