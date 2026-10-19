import { NextResponse } from "next/server";
import { notFound, pdfResponse } from "@/lib/modules/common";
import { requireProductApi } from "@/lib/modules/api-guard";
import { PayrollError } from "@/lib/modules/payroll";
import { buildIrp5Pdf } from "@/lib/modules/payroll-pdf";

export async function GET(req: Request) {
  const gate = await requireProductApi("payroll");
  if ("error" in gate) return gate.error;
  const year = Number(new URL(req.url).searchParams.get("year") ?? "");
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return NextResponse.json({ error: "Choose the tax year." }, { status: 400 });
  try {
    const pdf = await buildIrp5Pdf(gate.session.organizationId, year);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof PayrollError) return notFound();
    throw error;
  }
}
