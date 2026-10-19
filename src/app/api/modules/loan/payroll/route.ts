import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, parseBody, staffName } from "@/lib/modules/common";
import { periodLabel } from "@/lib/modules/aod-options";
import { aodDeductionsFor, recordPayrollDeductions } from "@/lib/modules/aod-payroll";
import { SLUG, currentPeriod } from "@/lib/modules/aod-server";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

const periodOf = (req: Request) => {
  const p = new URL(req.url).searchParams.get("period") ?? "";
  return /^\d{4}-\d{2}$/.test(p) ? p : currentPeriod();
};

/** The month's salary deductions, for the payroll administrator (Excel with ?format=xlsx). */
export async function GET(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const period = periodOf(req);
  const rows = await aodDeductionsFor(gate.session.organizationId, period);
  if (new URL(req.url).searchParams.get("format") === "xlsx") {
    const bytes = buildXlsx({
      sheetName: "Deductions",
      headers: ["Employee", "Employee number", "AOD", "Deduct", "Balance after", "Recorded"],
      rows: rows.map((r) => [r.employeeName, r.employeeNumber ?? "", r.reference ?? "", r.amount, r.balanceAfter, r.recorded ? "Yes" : "No"]),
      widths: [26, 16, 12, 12, 14, 10],
    });
    return xlsxResponse(bytes, `AOD deductions ${periodLabel(period)}`);
  }
  return NextResponse.json({ period, rows, total: Math.round(rows.reduce((a, r) => a + r.amount, 0) * 100) / 100 });
}

const input = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/), recordIds: z.array(z.string()).optional() });

/** Marks the month's deductions as taken (for companies that run payroll outside TaskCrate). */
export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "record salary deductions");
  if (denied) return denied;
  const body = await parseBody(req, input);
  if ("error" in body) return body.error;
  const count = await recordPayrollDeductions(gate.session.organizationId, body.data.period, await staffName(gate.session.userId), body.data.recordIds);
  return NextResponse.json({ recorded: count });
}
