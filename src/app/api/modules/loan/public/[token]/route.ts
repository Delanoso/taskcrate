import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { simpleBrandedPdf } from "@/lib/modules/pdf-simple";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.loanDeductibleRecord.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    record: {
      employeeName: item.employeeName,
      recordType: item.recordType,
      amount: item.amount,
      description: item.description,
      status: item.status,
      companyName: item.organization.branding?.displayName ?? item.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.loanDeductibleRecord.findUnique({ where: { publicToken: token } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({ signatureData: z.string().startsWith("data:image/") }).parse(await req.json());
  const updated = await db.loanDeductibleRecord.update({
    where: { id: item.id },
    data: { signatureData: body.signatureData, status: "signed", signedAt: new Date() },
  });
  const pdf = await simpleBrandedPdf({
    organizationId: item.organizationId,
    title: item.recordType === "loan" ? "Acknowledgment of Debt (AOD)" : "Incident Deductible Consent",
    prefix: "AOD",
    lines: [
      `Employee: ${item.employeeName}`,
      `Type: ${item.recordType}`,
      `Amount: ${item.amount}`,
      `Description: ${item.description}`,
      "I consent to deduction from my monthly payslip as described above.",
      `Signed at: ${new Date().toISOString()}`,
    ],
  });
  return NextResponse.json({
    ok: true,
    status: updated.status,
    pdfBase64: Buffer.from(pdf.bytes).toString("base64"),
    documentNumber: pdf.documentNumber,
  });
}
