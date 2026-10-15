import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

function when(d: Date | null) {
  if (!d) return "";
  return d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
}

export async function GET() {
  const gate = await requireProductApi("loan-deductible-ledger");
  if ("error" in gate) return gate.error;
  const items = await db.loanDeductibleRecord.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  const rows = items.map((item) => [
    when(item.createdAt),
    item.employeeName,
    item.employeeNumber ?? "",
    item.recordType === "loan" ? "Loan" : "Deductible",
    item.amount,
    item.description,
    item.repaymentNote ?? "",
    item.status,
    when(item.signedAt),
  ]);
  const bytes = buildXlsx({
    sheetName: "Ledger",
    headers: ["Opened", "Employee", "Employee number", "Type", "Amount", "Description", "Repayment", "Status", "Signed"],
    rows,
    widths: [22, 24, 16, 14, 12, 36, 28, 12, 22],
  });
  return xlsxResponse(bytes, "Loan and deductible ledger");
}
