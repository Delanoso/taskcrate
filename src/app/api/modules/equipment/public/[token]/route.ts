import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, companyName, notFound, parseBody, saDateKey } from "@/lib/modules/common";
import { CUSTODY_TERMS } from "@/lib/modules/equipment-options";
import { FOLDER, ISSUER, logEvent, signatureSchema } from "@/lib/modules/equipment-server";
import { saveDataUrlUpload } from "@/lib/uploads";

type Ctx = { params: Promise<{ token: string }> };

async function findBatch(token: string) {
  if (token.length < 16) return null;
  const issue = await db.equipmentIssue.findUnique({ where: { publicToken: token } });
  if (!issue) return null;
  const rows = await db.equipmentIssue.findMany({ where: { batchId: issue.batchId, status: { not: "cancelled" } }, include: { item: true }, orderBy: { createdAt: "asc" } });
  return { issue, rows };
}

export async function GET(_req: Request, { params }: Ctx) {
  const found = await findBatch((await params).token);
  if (!found) return notFound();
  const { issue, rows } = found;
  const pending = rows.filter((r) => r.status === "awaiting_signature");
  const signed = rows.find((r) => r.signedAt);
  return NextResponse.json({
    company: await companyName(issue.organizationId),
    documentNumber: issue.documentNumber,
    employeeName: issue.employeeName,
    issuedBy: issue.issuedBy,
    issuedAt: issue.createdAt.toISOString(),
    dueBackAt: issue.dueBackAt ? saDateKey(issue.dueBackAt) : null,
    accessories: issue.accessories,
    notes: issue.notesOut,
    items: rows.map((r) => ({ name: r.item.name, assetTag: r.item.assetTag, serialNumber: r.item.serialNumber, condition: r.conditionOut, value: r.item.value })),
    terms: CUSTODY_TERMS,
    status: rows.length === 0 ? "cancelled" : pending.length ? "awaiting_signature" : "signed",
    signedAt: signed?.signedAt?.toISOString() ?? null,
    signerName: signed?.signerName ?? null,
  });
}

const signInput = z.object({
  signerName: z.string().trim().min(3, "Type your full name").max(120),
  agree: z.literal(true, { error: "Tick the box to accept the custody terms" }),
  signature: signatureSchema,
});

export async function POST(req: Request, { params }: Ctx) {
  const found = await findBatch((await params).token);
  if (!found) return notFound();
  const pending = found.rows.filter((r) => r.status === "awaiting_signature");
  if (!pending.length) return NextResponse.json({ error: found.rows.length ? "Already signed." : "This was cancelled." }, { status: 409 });
  const body = await parseBody(req, signInput);
  if ("error" in body) return body.error;
  const orgId = found.issue.organizationId;
  const url = await saveDataUrlUpload(body.data.signature, `${FOLDER}/${orgId}`);
  await db.equipmentIssue.updateMany({
    where: { id: { in: pending.map((p) => p.id) } },
    data: { status: "active", signMethod: "link", signerName: body.data.signerName, signatureUrl: url, signedAt: new Date(), signIp: clientIp(req) },
  });
  for (const p of pending) await logEvent({ organizationId: orgId, itemId: p.itemId, issueId: p.id, employeeName: p.employeeName, action: "signed", by: body.data.signerName, note: "Signed via link" });
  await db.notification.create({
    data: {
      organizationId: orgId,
      productSlug: ISSUER,
      title: `${body.data.signerName} signed for equipment`,
      body: `${found.issue.documentNumber}: ${pending.map((p) => p.item.name).join(", ")}`.slice(0, 500),
    },
  });
  return NextResponse.json({ ok: true });
}
