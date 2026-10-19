import { db } from "@/lib/db";
import { companyName } from "@/lib/modules/common";
import { PayrollError } from "@/lib/modules/payroll";
import { TAX_YEAR_LABEL, formatRand } from "@/lib/modules/payroll-tax";
import { createBrandedDocument } from "@/lib/modules/pdf-kit";

function pretty(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!day) {
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-ZA", { timeZone: "UTC", month: "long", year: "numeric" });
  }
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-ZA", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function buildPayslipPdf(organizationId: string, lineId: string) {
  const line = await db.payrollLine.findFirst({
    where: { id: lineId, run: { organizationId } },
    include: { run: true },
  });
  if (!line) throw new PayrollError("Payslip not found");
  const [profile, employer] = await Promise.all([
    db.payrollProfile.findUnique({ where: { organizationId } }),
    companyName(organizationId),
  ]);
  const number = `PAY-${line.run.period}-${line.employeeNumber || line.id.slice(-6)}`;
  const doc = await createBrandedDocument({ organizationId, title: "Payslip", documentNumber: number });
  doc.heading(employer);
  doc.field("PAYE reference", profile?.payeNumber);
  doc.field("UIF reference", profile?.uifNumber);
  if (profile?.paySdl) doc.field("SDL reference", profile.sdlNumber);
  doc.field("Pay period", pretty(line.run.period));
  doc.field("Pay date", pretty(line.run.payDate));
  doc.field("Run", line.run.status === "FINALISED" ? "Finalised" : "Open");

  doc.heading("Employee");
  doc.field("Name", line.fullName);
  doc.field("Employee number", line.employeeNumber);
  doc.field("Job title", line.jobTitle);
  doc.field("ID number", line.idNumber);
  doc.field("Tax number", line.taxNumber);
  doc.field("Tax rebate", line.rebateLabel);
  if (line.bankName || line.accountNumber) {
    doc.field("Bank", [line.bankName, line.accountNumber, line.branchCode].filter(Boolean).join("  "));
  }

  doc.heading("Earnings");
  doc.field("Basic salary", formatRand(line.basicCents));
  if (line.allowanceCents) doc.field("Taxable allowances", formatRand(line.allowanceCents));
  if (line.onceOffCents) doc.field("Once-off this month", formatRand(line.onceOffCents));
  if (line.attendanceHours != null) doc.field("Clocked hours", String(line.attendanceHours));
  if (line.overtimeCents) doc.field(`Overtime${line.overtimeHours ? ` (${line.overtimeHours} h)` : ""}`, formatRand(line.overtimeCents));
  doc.field("Gross pay", formatRand(line.grossCents));

  doc.heading("Deductions");
  doc.field("PAYE", formatRand(line.payeCents));
  doc.field("UIF (employee 1%)", formatRand(line.uifEmployeeCents));
  if (line.pensionCents) doc.field("Pension or provident", formatRand(line.pensionCents));
  if (line.medicalDeductionCents) doc.field("Medical aid", formatRand(line.medicalDeductionCents));
  if (line.otherDeductionCents) doc.field(line.otherDeductionNote ?? "Other deductions", formatRand(line.otherDeductionCents), 220);
  doc.field("Net pay", formatRand(line.netCents));

  doc.heading("Paid by the company");
  doc.field("UIF (company 1%)", formatRand(line.uifEmployerCents));
  if (line.sdlCents) doc.field("Skills development levy", formatRand(line.sdlCents));
  if (line.employerPensionCents) doc.field("Pension or provident", formatRand(line.employerPensionCents));
  doc.field("Cost of this payslip", formatRand(line.employerCostCents));
  if (line.medicalCreditCents) doc.field("Medical tax credit in the PAYE", formatRand(line.medicalCreditCents));

  doc.heading("How this was worked out");
  doc.paragraph(
    `PAYE uses the SARS tax tables for ${TAX_YEAR_LABEL}. This month's pay is annualised, the rebates and medical tax credit are applied, and the result is divided by 12. UIF is 1% from the employee and 1% from the company, on pay up to R 17 712. Pension contributions reduce tax up to 27.5% of pay, capped at R 350 000 a year.`,
  );
  if (line.note) doc.paragraph(line.note);
  return { bytes: await doc.finish(), fileName: `Payslip ${line.fullName} ${line.run.period}` };
}

/** Figures the company types into the EMP201. TaskCrate does not submit the return. */
export async function buildPayrollPackPdf(organizationId: string, period: string) {
  const run = await db.payrollRun.findUnique({
    where: { organizationId_period: { organizationId, period } },
    include: { lines: true },
  });
  if (!run || !run.lines.length) throw new PayrollError("Calculate this month first");
  const lines = run.lines;
  const sum = (pick: (line: (typeof lines)[number]) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const paye = sum((line) => line.payeCents);
  const uifEmployee = sum((line) => line.uifEmployeeCents);
  const uifEmployer = sum((line) => line.uifEmployerCents);
  const sdl = sum((line) => line.sdlCents);
  const [profile, employer] = await Promise.all([
    db.payrollProfile.findUnique({ where: { organizationId } }),
    companyName(organizationId),
  ]);
  const doc = await createBrandedDocument({ organizationId, title: "Figures for the EMP201", documentNumber: `EMP201-${period}` });
  doc.heading(employer);
  doc.field("PAYE reference", profile?.payeNumber);
  doc.field("UIF reference", profile?.uifNumber);
  if (profile?.paySdl) doc.field("SDL reference", profile.sdlNumber);
  doc.field("Period", pretty(period));
  doc.field("Pay date", pretty(run.payDate));
  doc.field("Payslips", String(lines.length));
  doc.paragraph("These are the figures for the EMP201. TaskCrate does not submit this return to SARS. Type them into eFiling yourself, then pay SARS from your bank.");
  doc.heading("Amounts for the return");
  doc.field("PAYE", formatRand(paye));
  doc.field("UIF from staff", formatRand(uifEmployee));
  doc.field("UIF from the company", formatRand(uifEmployer));
  doc.field("Skills development levy", formatRand(sdl));
  doc.field("Total to pay SARS", formatRand(paye + uifEmployee + uifEmployer + sdl));
  doc.field("Net pay to transfer to staff", formatRand(sum((line) => line.netCents)));
  doc.paragraph("The bank file lists each person's account and net pay. A person with no account number is marked so the payment is not sent blind.");
  return { bytes: await doc.finish(), fileName: `EMP201 figures ${period}` };
}
