import { z } from "zod";
import type { AodPayment, AodReason, LoanDeductibleRecord } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { appUrl, jsonList, saDateKey } from "@/lib/modules/common";
import { BUILTIN_REASONS, aodTerms, schedule, type AodKind } from "@/lib/modules/aod-options";

export const SLUG = "loan-deductible-ledger";
export const FOLDER = "loan";

export const signingUrl = (token: string) => `${appUrl()}/p/loan/${token}`;
export const currentPeriod = () => saDateKey().slice(0, 7);
const round2 = (n: number) => Math.round(n * 100) / 100;

export type Reason = { key: string; label: string; kind: AodKind; custom: boolean };

export async function reasonsFor(organizationId: string, includeArchived = false): Promise<Reason[]> {
  const custom = await db.aodReason.findMany({ where: { organizationId, ...(includeArchived ? {} : { archived: false }) }, orderBy: { label: "asc" } });
  const other = BUILTIN_REASONS.find((r) => r.key === "other")!;
  return [
    ...BUILTIN_REASONS.filter((r) => r.key !== "other").map((r) => ({ ...r, custom: false })),
    ...custom.map((c: AodReason) => ({ key: `c:${c.id}`, label: c.label, kind: c.kind as AodKind, custom: true })),
    { ...other, custom: false },
  ];
}

export function reasonText(r: Pick<LoanDeductibleRecord, "reason" | "reasonLabel">) {
  return r.reasonLabel || BUILTIN_REASONS.find((b) => b.key === r.reason)?.label || r.reason;
}

type Full = LoanDeductibleRecord & { payments: AodPayment[] };

export function serializeAod(r: Full, now = currentPeriod()) {
  const paid = round2(r.payments.reduce((a, p) => a + p.amount, 0));
  const balance = round2(Math.max(0, r.amount - paid));
  const plan = schedule(r.amount, r.instalmentAmount, r.firstPeriod);
  const expectedBefore = round2(plan.filter((p) => p.period < now).reduce((a, p) => a + p.amount, 0));
  const status = r.status === "signed" ? "active" : r.status;
  let covered = paid;
  return {
    id: r.id,
    reference: r.reference,
    signingUrl: signingUrl(r.publicToken),
    employeeName: r.employeeName,
    employeeNumber: r.employeeNumber,
    employeePhone: r.employeePhone,
    employeeIdNumber: r.employeeIdNumber,
    kind: r.recordType as AodKind,
    reason: r.reason,
    reasonText: reasonText(r),
    amount: r.amount,
    description: r.description,
    incidentDate: r.incidentDate ? saDateKey(r.incidentDate) : null,
    instalmentAmount: r.instalmentAmount,
    instalments: plan.length,
    firstPeriod: r.firstPeriod,
    repayMethod: r.repayMethod,
    photos: [...(r.photoUrl ? [r.photoUrl] : []), ...jsonList(r.photosJson)],
    sourceRef: r.sourceRef,
    issuedBy: r.issuedBy,
    status,
    signerName: r.signerName,
    signIp: r.signIp,
    signedAt: r.signedAt?.toISOString() ?? null,
    employerSignerName: r.employerSignerName,
    declinedAt: r.declinedAt?.toISOString() ?? null,
    declineReason: r.declineReason,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    cancelReason: r.cancelReason,
    settledAt: r.settledAt?.toISOString() ?? null,
    lastRemindedAt: r.lastRemindedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    paid,
    balance,
    arrears: status === "active" ? round2(Math.max(0, expectedBefore - paid)) : 0,
    dueThisMonth: status === "active" ? instalmentDue(r, balance, now) : 0,
    schedule: plan.map((p) => {
      const take = Math.min(covered, p.amount);
      covered = round2(covered - take);
      return { ...p, paid: round2(take), state: take >= p.amount - 0.001 ? "paid" : p.period < now ? "late" : p.period === now ? "due" : "planned" };
    }),
    payments: r.payments
      .slice()
      .sort((a, b) => a.paidOn.getTime() - b.paidOn.getTime() || a.createdAt.getTime() - b.createdAt.getTime())
      .map((p) => ({ id: p.id, amount: p.amount, paidOn: saDateKey(p.paidOn), method: p.method, payrollPeriod: p.payrollPeriod, note: p.note, createdBy: p.createdBy })),
  };
}
export type AodRow = ReturnType<typeof serializeAod>;

/** What payroll takes for a month: the fixed instalment (or the balance if smaller) once the first month has come. */
export function instalmentDue(r: Pick<LoanDeductibleRecord, "instalmentAmount" | "firstPeriod">, balance: number, period: string) {
  if (!r.instalmentAmount || !r.firstPeriod || r.firstPeriod > period) return 0;
  return round2(Math.min(r.instalmentAmount, balance));
}

export function termsFor(r: LoanDeductibleRecord, company: string) {
  return aodTerms({
    company,
    employeeName: r.employeeName,
    employeeIdNumber: r.employeeIdNumber,
    amount: r.amount,
    reason: reasonText(r),
    description: r.description,
    kind: r.recordType as AodKind,
    instalment: r.instalmentAmount,
    instalments: schedule(r.amount, r.instalmentAmount, r.firstPeriod).length,
    firstPeriod: r.firstPeriod,
    method: r.repayMethod,
  });
}

/** Settles automatically once fully paid; reopens if a payment is removed. */
export async function syncSettled(id: string) {
  const r = await db.loanDeductibleRecord.findUniqueOrThrow({ where: { id }, include: { payments: true } });
  const paid = r.payments.reduce((a, p) => a + p.amount, 0);
  if (r.status === "active" && paid >= r.amount - 0.005) {
    await db.loanDeductibleRecord.update({ where: { id }, data: { status: "settled", settledAt: new Date() } });
  } else if (r.status === "settled" && paid < r.amount - 0.005) {
    await db.loanDeductibleRecord.update({ where: { id }, data: { status: "active", settledAt: null } });
  }
}

const optText = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => v || null);
const period = z.string().regex(/^\d{4}-\d{2}$/, "Choose the first month");

export const aodInput = z.object({
  employeeName: z.string().trim().min(2, "Who owes the money?").max(120),
  employeeNumber: optText(40),
  employeePhone: optText(30),
  employeeIdNumber: optText(30),
  reason: z.string().min(1, "Choose a reason"),
  reasonLabel: optText(120),
  amount: z.number().positive("Enter the amount").max(10_000_000),
  description: z.string().trim().min(3, "Describe what the amount is for").max(2000),
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  instalmentAmount: z.number().positive("Enter the monthly instalment").max(10_000_000),
  firstPeriod: period,
  repayMethod: z.enum(["payroll", "cash", "eft"]).default("payroll"),
  photos: z.array(z.string().regex(/^data:image\/(jpeg|png);base64,/)).max(6).default([]),
  sourceRef: optText(80),
});
