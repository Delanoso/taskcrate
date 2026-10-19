import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { jsonList, managersOnly, notFound, parseBody, removeUpload, staffName } from "@/lib/modules/common";
import { FOLDER, SLUG, serializeAod, syncSettled } from "@/lib/modules/aod-server";
import { saveDataUrlUpload } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string }> };
const load = (id: string, organizationId: string) => db.loanDeductibleRecord.findFirst({ where: { id, organizationId }, include: { payments: true } });
const fresh = async (id: string) => serializeAod(await db.loanDeductibleRecord.findUniqueOrThrow({ where: { id }, include: { payments: true } }));

export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const r = await load((await params).id, gate.session.organizationId);
  if (!r) return notFound();
  return NextResponse.json({ record: serializeAod(r) });
}

const sig = z.string().regex(/^data:image\/png;base64,/, "Signature is required").max(1_500_000);
const patchInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sign_now"), signerName: z.string().trim().min(3, "Type the employee's full name").max(120), signature: sig, agree: z.literal(true, { error: "The employee must agree to the terms" }) }),
  z.object({ action: z.literal("employer_sign"), name: z.string().trim().min(2).max(120), signature: sig }),
  z.object({
    action: z.literal("plan"),
    amount: z.number().positive().max(10_000_000),
    instalmentAmount: z.number().positive("Enter the monthly instalment").max(10_000_000),
    firstPeriod: z.string().regex(/^\d{4}-\d{2}$/, "Choose the first month"),
    repayMethod: z.enum(["payroll", "cash", "eft"]),
    description: z.string().trim().min(3).max(2000),
  }),
  z.object({ action: z.literal("remind") }),
  z.object({ action: z.literal("reissue") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3, "Say why").max(500) }),
  z.object({
    action: z.literal("payment"),
    amount: z.number().positive("Enter the amount").max(10_000_000),
    paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    method: z.enum(["payroll", "cash", "eft", "other"]),
    payrollPeriod: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
    note: z.string().trim().max(300).optional(),
  }),
  z.object({ action: z.literal("remove_payment"), paymentId: z.string() }),
]);

export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const r = await load((await params).id, orgId);
  if (!r) return notFound();
  const body = await parseBody(req, patchInput);
  if ("error" in body) return body.error;
  const b = body.data;
  const by = await staffName(gate.session.userId);
  const folder = `${FOLDER}/${orgId}`;
  const status = r.status === "signed" ? "active" : r.status;

  if (b.action === "plan") {
    if (status !== "pending") return NextResponse.json({ error: "A signed AOD cannot be changed. Cancel it and create a new one." }, { status: 409 });
    if (b.instalmentAmount > b.amount) return NextResponse.json({ error: "The instalment cannot be more than the amount owed." }, { status: 400 });
    await db.loanDeductibleRecord.update({ where: { id: r.id }, data: { amount: b.amount, instalmentAmount: b.instalmentAmount, firstPeriod: b.firstPeriod, repayMethod: b.repayMethod, description: b.description } });
  } else if (b.action === "sign_now") {
    if (status !== "pending") return NextResponse.json({ error: "This AOD is not waiting for a signature." }, { status: 409 });
    if (!r.instalmentAmount || !r.firstPeriod) return NextResponse.json({ error: "Set the repayment plan first." }, { status: 409 });
    await db.loanDeductibleRecord.update({
      where: { id: r.id },
      data: { status: "active", signerName: b.signerName, signatureData: await saveDataUrlUpload(b.signature, folder), signedAt: new Date(), signIp: null },
    });
  } else if (b.action === "employer_sign") {
    if (r.employerSignature) await removeUpload(r.employerSignature, FOLDER, orgId);
    await db.loanDeductibleRecord.update({ where: { id: r.id }, data: { employerSignerName: b.name, employerSignature: await saveDataUrlUpload(b.signature, folder) } });
  } else if (b.action === "remind") {
    await db.loanDeductibleRecord.update({ where: { id: r.id }, data: { lastRemindedAt: new Date() } });
  } else if (b.action === "reissue") {
    if (status !== "declined") return NextResponse.json({ error: "Only declined AODs can be sent again." }, { status: 409 });
    await db.loanDeductibleRecord.update({ where: { id: r.id }, data: { status: "pending", declinedAt: null, declineReason: null, publicToken: randomBytes(18).toString("base64url") } });
  } else if (b.action === "cancel") {
    const denied = managersOnly(gate.access, "cancel or write off an AOD");
    if (denied) return denied;
    if (status === "settled" || status === "cancelled") return NextResponse.json({ error: "This AOD is already closed." }, { status: 409 });
    await db.loanDeductibleRecord.update({ where: { id: r.id }, data: { status: "cancelled", cancelledAt: new Date(), cancelReason: `${b.reason} (${by})` } });
  } else if (b.action === "payment") {
    if (status !== "active") return NextResponse.json({ error: status === "pending" ? "The employee must sign before payments are recorded." : "This AOD is closed." }, { status: 409 });
    const paid = r.payments.reduce((a, p) => a + p.amount, 0);
    if (b.amount > r.amount - paid + 0.005) return NextResponse.json({ error: `That is more than the balance of R ${(r.amount - paid).toFixed(2)}.` }, { status: 400 });
    if (b.method === "payroll" && b.payrollPeriod && r.payments.some((p) => p.payrollPeriod === b.payrollPeriod)) {
      return NextResponse.json({ error: "A salary deduction is already recorded for that month." }, { status: 409 });
    }
    await db.aodPayment.create({
      data: { recordId: r.id, amount: b.amount, paidOn: new Date(`${b.paidOn}T12:00:00+02:00`), method: b.method, payrollPeriod: b.method === "payroll" ? (b.payrollPeriod ?? b.paidOn.slice(0, 7)) : null, note: b.note || null, createdBy: by },
    });
    await syncSettled(r.id);
  } else {
    const denied = managersOnly(gate.access, "remove a payment");
    if (denied) return denied;
    const p = r.payments.find((x) => x.id === b.paymentId);
    if (!p) return notFound();
    await db.aodPayment.delete({ where: { id: p.id } });
    await syncSettled(r.id);
  }
  return NextResponse.json({ record: await fresh(r.id) });
}

/** Only AODs that were never signed (or were declined/cancelled with no payments) can be deleted. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "delete an AOD");
  if (denied) return denied;
  const orgId = gate.session.organizationId;
  const r = await load((await params).id, orgId);
  if (!r) return notFound();
  if (r.payments.length || r.status === "active" || r.status === "settled" || r.status === "signed") {
    return NextResponse.json({ error: "A signed AOD is a legal record. Cancel it instead of deleting it." }, { status: 409 });
  }
  for (const u of [r.photoUrl, r.signatureData, r.employerSignature, ...jsonList(r.photosJson)]) if (u) await removeUpload(u, FOLDER, orgId);
  await db.loanDeductibleRecord.delete({ where: { id: r.id } });
  return NextResponse.json({ ok: true });
}
