import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

const rands = (cents: number) => cents / 100;

export async function GET(req: Request) {
  const gate = await requireProductApi("payroll");
  if ("error" in gate) return gate.error;
  const org = gate.session.organizationId;
  const scope = new URL(req.url).searchParams.get("scope");
  if (scope === "runs") {
    const runs = await db.payrollRun.findMany({
      where: { organizationId: org },
      include: { lines: { orderBy: { fullName: "asc" } } },
      orderBy: { period: "desc" },
    });
    const rows = runs.flatMap((run) =>
      run.lines.map((line) => [
        run.period,
        run.payDate,
        run.status,
        line.fullName,
        line.employeeNumber ?? "",
        line.idNumber ?? "",
        line.taxNumber ?? "",
        line.jobTitle ?? "",
        line.bankName ?? "",
        line.accountNumber ?? "",
        line.branchCode ?? "",
        rands(line.basicCents),
        rands(line.allowanceCents),
        rands(line.onceOffCents),
        rands(line.grossCents),
        rands(line.payeCents),
        rands(line.uifEmployeeCents),
        rands(line.pensionCents),
        rands(line.medicalDeductionCents),
        rands(line.netCents),
        rands(line.uifEmployerCents),
        rands(line.sdlCents),
        rands(line.employerPensionCents),
        rands(line.employerCostCents),
        rands(line.medicalCreditCents),
        line.rebateLabel ?? "",
        line.ageAtYearEnd ?? "",
        line.note ?? "",
      ]),
    );
    const bytes = buildXlsx({
      sheetName: "Pay runs",
      headers: [
        "Period",
        "Pay date",
        "Status",
        "Name",
        "Employee number",
        "ID number",
        "Tax number",
        "Job title",
        "Bank",
        "Account number",
        "Branch code",
        "Basic",
        "Allowances",
        "Once-off",
        "Gross",
        "PAYE",
        "UIF employee",
        "Pension employee",
        "Medical aid",
        "Net pay",
        "UIF company",
        "SDL",
        "Pension company",
        "Employer cost",
        "Medical tax credit",
        "Rebate",
        "Age at tax year end",
        "Note",
      ],
      rows,
      widths: Array(28).fill(16),
    });
    return xlsxResponse(bytes, "Payroll runs");
  }

  const employees = await db.payrollEmployee.findMany({ where: { organizationId: org }, orderBy: { fullName: "asc" } });
  const rows = employees.map((employee) => [
    employee.fullName,
    employee.employeeNumber ?? "",
    employee.idNumber ?? "",
    employee.taxNumber ?? "",
    employee.dateOfBirth ?? "",
    employee.startDate ?? "",
    employee.jobTitle ?? "",
    employee.email ?? "",
    employee.phone ?? "",
    employee.bankName ?? "",
    employee.accountNumber ?? "",
    employee.branchCode ?? "",
    employee.accountType ?? "",
    rands(employee.monthlySalaryCents),
    rands(employee.allowanceCents),
    rands(employee.pensionCents),
    rands(employee.employerPensionCents),
    employee.medicalMember ? "Yes" : "No",
    employee.medicalDependants,
    rands(employee.medicalDeductionCents),
    employee.paysUif ? "Yes" : "No",
    employee.active ? "Yes" : "No",
  ]);
  const bytes = buildXlsx({
    sheetName: "Employees",
    headers: [
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
      "Active",
    ],
    rows,
    widths: Array(22).fill(18),
  });
  return xlsxResponse(bytes, "Payroll employees");
}
