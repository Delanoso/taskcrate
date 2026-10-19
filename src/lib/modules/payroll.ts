import { z } from "zod";
import { db } from "@/lib/db";
import { parsePayrollRows, type PayrollImportRow } from "@/lib/modules/payroll-import";
import { calculatePayslip, dobFromSaId, payDateFor, randsToCents } from "@/lib/modules/payroll-tax";
import { aodDeductionsFor, matchDeductions, recordPayrollDeductions, reversePayrollDeductions } from "@/lib/modules/aod-payroll";

export class PayrollError extends Error {}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const money = z.number().min(0).max(100_000_000);

const profileSchema = z.object({
  payeNumber: z.string().trim().min(2, "Add the PAYE number").max(40),
  uifNumber: z.string().trim().min(2, "Add the UIF number").max(40),
  sdlNumber: optionalText(40),
  paySdl: z.boolean(),
  payDay: z.number().int().min(1).max(31),
});

const employeeSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(2, "Add the full name").max(160),
  employeeNumber: optionalText(40),
  idNumber: optionalText(20),
  taxNumber: optionalText(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  jobTitle: optionalText(80),
  email: optionalText(120),
  phone: optionalText(40),
  bankName: optionalText(80),
  accountNumber: optionalText(40),
  branchCode: optionalText(20),
  accountType: optionalText(40),
  monthlySalary: money,
  allowances: money,
  pension: money,
  employerPension: money,
  medicalMember: z.boolean(),
  medicalDependants: z.number().int().min(0).max(20),
  medicalDeduction: money,
  paysUif: z.boolean(),
  active: z.boolean().optional(),
});

function blank(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function employeeData(row: z.infer<typeof employeeSchema> | PayrollImportRow, active?: boolean) {
  const fromImport = "monthlySalaryCents" in row;
  const idNumber = blank(row.idNumber);
  const dateOfBirth = blank("dateOfBirth" in row ? row.dateOfBirth : null) ?? dobFromSaId(idNumber);
  return {
    fullName: row.fullName.trim(),
    employeeNumber: blank(row.employeeNumber),
    idNumber,
    taxNumber: blank(row.taxNumber),
    dateOfBirth,
    startDate: blank(row.startDate),
    jobTitle: blank(row.jobTitle),
    email: blank(row.email),
    phone: blank(row.phone),
    bankName: blank(row.bankName),
    accountNumber: blank(row.accountNumber),
    branchCode: blank(row.branchCode),
    accountType: blank(row.accountType),
    monthlySalaryCents: fromImport ? row.monthlySalaryCents : randsToCents(row.monthlySalary),
    allowanceCents: fromImport ? row.allowanceCents : randsToCents(row.allowances),
    pensionCents: fromImport ? row.pensionCents : randsToCents(row.pension),
    employerPensionCents: fromImport ? row.employerPensionCents : randsToCents(row.employerPension),
    medicalMember: row.medicalMember,
    medicalDependants: row.medicalDependants,
    medicalDeductionCents: fromImport ? row.medicalDeductionCents : randsToCents(row.medicalDeduction),
    paysUif: row.paysUif,
    ...(active === undefined ? {} : { active }),
  };
}

export async function payrollSnapshot(organizationId: string) {
  const [profile, employees, runs] = await Promise.all([
    db.payrollProfile.findUnique({ where: { organizationId } }),
    db.payrollEmployee.findMany({ where: { organizationId }, orderBy: { fullName: "asc" } }),
    db.payrollRun.findMany({
      where: { organizationId },
      include: { lines: { orderBy: { fullName: "asc" } } },
      orderBy: { period: "desc" },
    }),
  ]);
  return { profile, employees, runs };
}

export async function savePayrollProfile(organizationId: string, raw: unknown) {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) throw new PayrollError(parsed.error.issues[0]?.message ?? "Check the payroll setup");
  if (parsed.data.paySdl && !parsed.data.sdlNumber?.trim()) throw new PayrollError("Add the SDL number");
  const saved = {
    payeNumber: parsed.data.payeNumber.trim(),
    uifNumber: parsed.data.uifNumber.trim(),
    sdlNumber: blank(parsed.data.sdlNumber),
    paySdl: parsed.data.paySdl,
    payDay: parsed.data.payDay,
  };
  return db.payrollProfile.upsert({
    where: { organizationId },
    create: { organizationId, ...saved },
    update: saved,
  });
}

async function assertUniqueNumber(organizationId: string, employeeNumber: string | null, ignoreId?: string) {
  if (!employeeNumber) return;
  const existing = await db.payrollEmployee.findFirst({
    where: { organizationId, employeeNumber, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
  });
  if (existing) throw new PayrollError(`${employeeNumber} is already used by ${existing.fullName}`);
}

export async function setPayrollActive(organizationId: string, id: string, active: boolean) {
  const employee = await db.payrollEmployee.findFirst({ where: { id, organizationId } });
  if (!employee) throw new PayrollError("Employee not found");
  return db.payrollEmployee.update({ where: { id }, data: { active } });
}

export async function savePayrollEmployee(organizationId: string, raw: unknown) {
  const parsed = employeeSchema.safeParse(raw);
  if (!parsed.success) throw new PayrollError(parsed.error.issues[0]?.message ?? "Check the employee");
  if (parsed.data.monthlySalary <= 0) throw new PayrollError("Monthly salary must be greater than 0");
  const data = employeeData(parsed.data, parsed.data.active ?? true);
  await assertUniqueNumber(organizationId, data.employeeNumber, parsed.data.id);
  if (parsed.data.id) {
    const existing = await db.payrollEmployee.findFirst({ where: { id: parsed.data.id, organizationId } });
    if (!existing) throw new PayrollError("Employee not found");
    return db.payrollEmployee.update({ where: { id: existing.id }, data });
  }
  return db.payrollEmployee.create({ data: { organizationId, ...data, active: true } });
}

export async function importPayrollEmployees(organizationId: string, rows: unknown[]) {
  const parsed = parsePayrollRows([
    [
      "Full name",
      "Employee number",
      "ID number",
      "Tax number",
      "Date of birth",
      "Start date",
      "Job title",
      "Email",
      "Phone",
      "Bank",
      "Account number",
      "Branch code",
      "Account type",
      "Monthly salary",
      "Taxable allowances",
      "Pension employee",
      "Pension company",
      "On medical aid",
      "Medical dependants",
      "Medical aid deduction",
      "Pays UIF",
    ],
    ...rows.map((row) => {
      const item = row as PayrollImportRow;
      return [
        item.fullName ?? "",
        item.employeeNumber ?? "",
        item.idNumber ?? "",
        item.taxNumber ?? "",
        item.dateOfBirth ?? "",
        item.startDate ?? "",
        item.jobTitle ?? "",
        item.email ?? "",
        item.phone ?? "",
        item.bankName ?? "",
        item.accountNumber ?? "",
        item.branchCode ?? "",
        item.accountType ?? "",
        String((item.monthlySalaryCents ?? 0) / 100),
        String((item.allowanceCents ?? 0) / 100),
        String((item.pensionCents ?? 0) / 100),
        String((item.employerPensionCents ?? 0) / 100),
        item.medicalMember ? "Yes" : "No",
        String(item.medicalDependants ?? 0),
        String((item.medicalDeductionCents ?? 0) / 100),
        item.paysUif === false ? "No" : "Yes",
      ];
    }),
  ]);
  if (parsed.errors.length) throw new PayrollError(parsed.errors[0]);
  return writeImport(organizationId, parsed.rows);
}

async function writeImport(organizationId: string, rows: PayrollImportRow[]) {
  const existing = await db.payrollEmployee.findMany({ where: { organizationId } });
  const byNumber = new Map(existing.filter((e) => e.employeeNumber).map((e) => [e.employeeNumber!.toLowerCase(), e]));
  const byName = new Map(existing.map((e) => [e.fullName.toLowerCase(), e]));
  let created = 0;
  let updated = 0;
  await db.$transaction(async (tx) => {
    for (const row of rows) {
      const data = employeeData(row, true);
      const match =
        (data.employeeNumber && byNumber.get(data.employeeNumber.toLowerCase())) || byName.get(data.fullName.toLowerCase());
      if (match) {
        const saved = await tx.payrollEmployee.update({ where: { id: match.id }, data });
        byName.set(saved.fullName.toLowerCase(), saved);
        if (saved.employeeNumber) byNumber.set(saved.employeeNumber.toLowerCase(), saved);
        updated++;
      } else {
        const saved = await tx.payrollEmployee.create({ data: { organizationId, ...data, active: true } });
        byName.set(saved.fullName.toLowerCase(), saved);
        if (saved.employeeNumber) byNumber.set(saved.employeeNumber.toLowerCase(), saved);
        created++;
      }
    }
  });
  return { created, updated };
}

export async function calculatePayroll(organizationId: string, period: string, extras: Record<string, number>) {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new PayrollError("Choose a month");
  const profile = await db.payrollProfile.findUnique({ where: { organizationId } });
  if (!profile) throw new PayrollError("Save the PAYE and UIF setup first");
  const existing = await db.payrollRun.findUnique({ where: { organizationId_period: { organizationId, period } } });
  if (existing?.status === "FINALISED") throw new PayrollError("This month is finalised. Reopen it before calculating again.");
  const employees = await db.payrollEmployee.findMany({ where: { organizationId, active: true }, orderBy: { fullName: "asc" } });
  if (!employees.length) throw new PayrollError("Add at least one active employee");
  const payDate = payDateFor(period, profile.payDay);
  const aod = matchDeductions(await aodDeductionsFor(organizationId, period), employees).byEmployee;
  const lines = employees.map((employee) => {
    const onceOff = randsToCents(Number(extras[employee.id] ?? 0) || 0);
    const pay = calculatePayslip({
      period,
      basicCents: employee.monthlySalaryCents,
      allowanceCents: employee.allowanceCents,
      onceOffCents: Math.max(0, onceOff),
      pensionCents: employee.pensionCents,
      employerPensionCents: employee.employerPensionCents,
      medicalMember: employee.medicalMember,
      medicalDependants: employee.medicalDependants,
      medicalDeductionCents: employee.medicalDeductionCents,
      paysUif: employee.paysUif,
      paySdl: profile.paySdl,
      dateOfBirth: employee.dateOfBirth,
    });
    const notes = [...pay.notes];
    const debt = aod.get(employee.id);
    if (!employee.taxNumber) notes.push("No tax number on file.");
    if (!employee.accountNumber) notes.push("No bank account on file.");
    return {
      employeeId: employee.id,
      fullName: employee.fullName,
      employeeNumber: employee.employeeNumber,
      idNumber: employee.idNumber,
      taxNumber: employee.taxNumber,
      jobTitle: employee.jobTitle,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      branchCode: employee.branchCode,
      basicCents: employee.monthlySalaryCents,
      allowanceCents: employee.allowanceCents,
      onceOffCents: Math.max(0, onceOff),
      pensionCents: employee.pensionCents,
      employerPensionCents: employee.employerPensionCents,
      grossCents: pay.cashGrossCents,
      taxableMonthlyCents: pay.taxableMonthlyCents,
      payeCents: pay.payeCents,
      uifEmployeeCents: pay.uifEmployeeCents,
      uifEmployerCents: pay.uifEmployerCents,
      sdlCents: pay.sdlCents,
      medicalCreditCents: pay.medicalCreditCents,
      medicalDeductionCents: employee.medicalDeductionCents,
      otherDeductionCents: debt?.cents ?? 0,
      otherDeductionNote: debt ? `AOD repayment (${debt.refs.join(", ")})` : null,
      netCents: pay.netCents - (debt?.cents ?? 0),
      employerCostCents: pay.employerCostCents,
      ageAtYearEnd: pay.ageAtYearEnd,
      rebateLabel: pay.rebateLabel,
      note: notes.join(" ") || null,
    };
  });
  return db.$transaction(async (tx) => {
    const run = existing
      ? await tx.payrollRun.update({ where: { id: existing.id }, data: { payDate, status: "OPEN", finalisedAt: null } })
      : await tx.payrollRun.create({ data: { organizationId, period, payDate, status: "OPEN" } });
    await tx.payrollLine.deleteMany({ where: { runId: run.id } });
    await tx.payrollLine.createMany({ data: lines.map((line) => ({ ...line, runId: run.id })) });
    return tx.payrollRun.findUniqueOrThrow({ where: { id: run.id }, include: { lines: { orderBy: { fullName: "asc" } } } });
  });
}

export async function finalisePayroll(organizationId: string, period: string) {
  const run = await db.payrollRun.findUnique({
    where: { organizationId_period: { organizationId, period } },
    include: { lines: true },
  });
  if (!run) throw new PayrollError("Calculate this month first");
  if (!run.lines.length) throw new PayrollError("Calculate this month first");
  const incomplete = run.lines.filter((line) => !line.taxNumber || !line.accountNumber);
  if (incomplete.length) {
    throw new PayrollError(
      `Add the tax number and bank account for ${incomplete.map((line) => line.fullName).join(", ")}. Then calculate again.`,
    );
  }
  const short = run.lines.filter((line) => line.netCents < 0);
  if (short.length) {
    throw new PayrollError(`Deductions are higher than the pay for ${short.map((line) => line.fullName).join(", ")}.`);
  }
  const finalised = await db.payrollRun.update({ where: { id: run.id }, data: { status: "FINALISED", finalisedAt: new Date() } });
  const staff = await db.payrollEmployee.findMany({ where: { id: { in: run.lines.filter((l) => l.otherDeductionCents > 0).map((l) => l.employeeId!).filter(Boolean) } }, select: { id: true, fullName: true, employeeNumber: true } });
  const matched = matchDeductions(await aodDeductionsFor(organizationId, period), staff).byEmployee;
  await recordPayrollDeductions(organizationId, period, "Payroll", [...matched.values()].flatMap((m) => m.recordIds));
  return finalised;
}

export async function reopenPayroll(organizationId: string, period: string) {
  const run = await db.payrollRun.findUnique({ where: { organizationId_period: { organizationId, period } } });
  if (!run) throw new PayrollError("That month has not been run");
  await reversePayrollDeductions(organizationId, period);
  return db.payrollRun.update({ where: { id: run.id }, data: { status: "OPEN", finalisedAt: null } });
}
