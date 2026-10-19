import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { STATUS_LABEL, methodLabel } from "@/lib/modules/aod-options";
import { SLUG, serializeAod } from "@/lib/modules/aod-server";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const items = await db.loanDeductibleRecord.findMany({ where: { organizationId: gate.session.organizationId }, include: { payments: true }, orderBy: { createdAt: "desc" } });
  const rows = items.map((r) => {
    const s = serializeAod(r);
    return [
      s.reference ?? "",
      s.createdAt.slice(0, 10),
      s.employeeName,
      s.employeeNumber ?? "",
      s.reasonText,
      s.kind === "deductible" ? "Loss / damage" : "Loan",
      s.amount,
      s.instalmentAmount ?? "",
      s.firstPeriod ?? "",
      methodLabel(s.repayMethod),
      s.paid,
      s.balance,
      s.arrears,
      STATUS_LABEL[s.status] ?? s.status,
      s.signedAt ? s.signedAt.slice(0, 10) : "",
      s.description,
    ];
  });
  const bytes = buildXlsx({
    sheetName: "AOD Book",
    headers: ["Reference", "Opened", "Employee", "Employee number", "Reason", "Type", "Amount", "Instalment", "First month", "Repaid by", "Paid", "Balance", "Arrears", "Status", "Signed", "Details"],
    rows,
    widths: [12, 12, 24, 14, 28, 14, 12, 12, 12, 16, 12, 12, 12, 18, 12, 40],
  });
  return xlsxResponse(bytes, "AOD Book");
}
