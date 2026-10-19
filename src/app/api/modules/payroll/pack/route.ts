import { NextResponse } from "next/server";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { PayrollError } from "@/lib/modules/payroll";
import { buildPayrollPackPdf } from "@/lib/modules/payroll-pdf";

export async function GET(req: Request) {
  const gate = await requireProductApi("payroll");
  if ("error" in gate) return gate.error;
  const period = new URL(req.url).searchParams.get("period") ?? "";
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: "Choose a month." }, { status: 400 });
  try {
    const pdf = await buildPayrollPackPdf(gate.session.organizationId, period);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof PayrollError) return notFound();
    throw error;
  }
}
