import { requireProductApi } from "@/lib/modules/api-guard";
import { PAYROLL_COLUMNS } from "@/lib/modules/payroll-import";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi("payroll");
  if ("error" in gate) return gate.error;
  const bytes = buildXlsx({
    sheetName: "Employees",
    headers: PAYROLL_COLUMNS.map((column) => column.label),
    rows: [PAYROLL_COLUMNS.map((column) => column.example)],
    widths: PAYROLL_COLUMNS.map(() => 20),
  });
  return xlsxResponse(bytes, "Payroll employees template");
}
