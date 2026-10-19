import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, companyName, notFound, parseBody } from "@/lib/modules/common";
import { FOLDER, SLUG, serializeAod, termsFor } from "@/lib/modules/aod-server";
import { saveDataUrlUpload } from "@/lib/uploads";

type Ctx = { params: Promise<{ token: string }> };
const find = (token: string) => (token.length < 10 ? null : db.loanDeductibleRecord.findUnique({ where: { publicToken: token }, include: { payments: true } }));

export async function GET(_req: Request, { params }: Ctx) {
  const r = await find((await params).token);
  if (!r) return notFound();
  const s = serializeAod(r);
  const company = await companyName(r.organizationId);
  return NextResponse.json({
    company,
    reference: s.reference,
    employeeName: s.employeeName,
    reasonText: s.reasonText,
    kind: s.kind,
    amount: s.amount,
    description: s.description,
    incidentDate: s.incidentDate,
    instalmentAmount: s.instalmentAmount,
    instalments: s.instalments,
    firstPeriod: s.firstPeriod,
    repayMethod: s.repayMethod,
    photos: s.photos,
    terms: s.status === "cancelled" ? [] : termsFor(r, company),
    status: s.status,
    planReady: !!(s.instalmentAmount && s.firstPeriod),
    signedAt: s.signedAt,
    signerName: s.signerName,
    declinedAt: s.declinedAt,
    paid: s.paid,
    balance: s.balance,
    schedule: s.schedule,
  });
}

const signInput = z.object({
  signerName: z.string().trim().min(3, "Type your full name").max(120),
  idNumber: z.string().trim().max(30).nullable().optional(),
  agree: z.literal(true, { error: "Tick the box to confirm you agree" }),
  signature: z.string().regex(/^data:image\/png;base64,/, "Please sign in the box").max(1_500_000),
});

export async function POST(req: Request, { params }: Ctx) {
  const r = await find((await params).token);
  if (!r) return notFound();
  if (r.status !== "pending") return NextResponse.json({ error: r.status === "declined" ? "You declined this AOD." : r.status === "cancelled" ? "This AOD was withdrawn." : "This AOD is already signed." }, { status: 409 });
  if (!r.instalmentAmount || !r.firstPeriod) return NextResponse.json({ error: "The company still needs to set the repayment plan. Please ask them to resend the link." }, { status: 409 });
  const body = await parseBody(req, signInput);
  if ("error" in body) return body.error;
  await db.loanDeductibleRecord.update({
    where: { id: r.id },
    data: {
      status: "active",
      signerName: body.data.signerName,
      employeeIdNumber: r.employeeIdNumber ?? (body.data.idNumber || null),
      signatureData: await saveDataUrlUpload(body.data.signature, `${FOLDER}/${r.organizationId}`),
      signedAt: new Date(),
      signIp: clientIp(req),
    },
  });
  await db.notification.create({
    data: { organizationId: r.organizationId, productSlug: SLUG, title: `${body.data.signerName} signed ${r.reference ?? "an AOD"}`, body: `R ${r.amount.toFixed(2)} acknowledged. Repayments can now be recorded.` },
  });
  return NextResponse.json({ ok: true });
}
