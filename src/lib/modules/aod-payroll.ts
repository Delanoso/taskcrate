import { db } from "@/lib/db";
import { instalmentDue } from "@/lib/modules/aod-server";

const key = (name: string, number: string | null) => (number ? `#${number.trim().toLowerCase()}` : name.trim().toLowerCase());

/** Salary deductions due for a month, per signed AOD that is repaid through payroll. */
export async function aodDeductionsFor(organizationId: string, period: string) {
  const records = await db.loanDeductibleRecord.findMany({
    where: { organizationId, status: { in: ["active", "signed"] }, repayMethod: "payroll" },
    include: { payments: true },
  });
  const rows = [];
  for (const r of records) {
    const already = r.payments.find((p) => p.payrollPeriod === period);
    const paidOther = r.payments.filter((p) => p.payrollPeriod !== period).reduce((a, p) => a + p.amount, 0);
    const balance = Math.max(0, r.amount - paidOther);
    const due = already ? already.amount : instalmentDue(r, balance, period);
    if (due <= 0) continue;
    rows.push({ recordId: r.id, reference: r.reference, employeeName: r.employeeName, employeeNumber: r.employeeNumber, amount: due, recorded: !!already, balanceAfter: Math.round((balance - due) * 100) / 100 });
  }
  return rows;
}

/** Matches AOD deductions to payroll staff by employee number, else by name. */
export function matchDeductions(rows: Awaited<ReturnType<typeof aodDeductionsFor>>, staff: { id: string; fullName: string; employeeNumber: string | null }[]) {
  const byKey = new Map<string, string>();
  for (const s of staff) {
    if (s.employeeNumber) byKey.set(key(s.fullName, s.employeeNumber), s.id);
    byKey.set(key(s.fullName, null), s.id);
  }
  const out = new Map<string, { cents: number; refs: string[]; recordIds: string[] }>();
  const unmatched: typeof rows = [];
  for (const r of rows) {
    const id = byKey.get(key(r.employeeName, r.employeeNumber)) ?? byKey.get(key(r.employeeName, null));
    if (!id) { unmatched.push(r); continue; }
    const cur = out.get(id) ?? { cents: 0, refs: [], recordIds: [] };
    cur.cents += Math.round(r.amount * 100);
    cur.refs.push(r.reference ?? "AOD");
    cur.recordIds.push(r.recordId);
    out.set(id, cur);
  }
  return { byEmployee: out, unmatched };
}

/** Records the month's salary deductions as AOD payments (skips any already recorded). */
export async function recordPayrollDeductions(organizationId: string, period: string, by: string, onlyRecordIds?: string[]) {
  const rows = await aodDeductionsFor(organizationId, period);
  let count = 0;
  for (const r of rows) {
    if (r.recorded || (onlyRecordIds && !onlyRecordIds.includes(r.recordId))) continue;
    await db.aodPayment.create({ data: { recordId: r.recordId, amount: r.amount, paidOn: new Date(), method: "payroll", payrollPeriod: period, note: "Salary deduction", createdBy: by } });
    const rec = await db.loanDeductibleRecord.findUniqueOrThrow({ where: { id: r.recordId }, include: { payments: true } });
    if (rec.payments.reduce((a, p) => a + p.amount, 0) >= rec.amount - 0.005) await db.loanDeductibleRecord.update({ where: { id: rec.id }, data: { status: "settled", settledAt: new Date() } });
    count++;
  }
  return count;
}

/** Undo a month's salary deductions (when a payroll month is reopened). */
export async function reversePayrollDeductions(organizationId: string, period: string) {
  const payments = await db.aodPayment.findMany({ where: { payrollPeriod: period, method: "payroll", record: { organizationId } }, select: { id: true, recordId: true } });
  await db.aodPayment.deleteMany({ where: { id: { in: payments.map((p) => p.id) } } });
  const ids = [...new Set(payments.map((p) => p.recordId))];
  await db.loanDeductibleRecord.updateMany({ where: { id: { in: ids }, status: "settled" }, data: { status: "active", settledAt: null } });
  return payments.length;
}
