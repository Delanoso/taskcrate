import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { saveDataUrlUpload } from "@/lib/uploads";
import { simpleBrandedPdf } from "@/lib/modules/pdf-simple";

export async function GET() {
  const gate = await requireProductApi("loan-deductible-ledger");
  if ("error" in gate) return gate.error;
  const items = await db.loanDeductibleRecord.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("loan-deductible-ledger");
  if ("error" in gate) return gate.error;
  const body = z.object({
    employeeName: z.string().min(2),
    employeeNumber: z.string().trim().max(40).optional(),
    recordType: z.enum(["loan", "deductible"]),
    amount: z.number().positive(),
    description: z.string().min(2),
    repaymentNote: z.string().trim().max(500).optional(),
    photoDataUrl: z.string().startsWith("data:image/").optional(),
  }).parse(await req.json());
  let photoUrl: string | undefined;
  if (body.photoDataUrl) {
    photoUrl = await saveDataUrlUpload(body.photoDataUrl, `loan/${gate.session.organizationId}`);
  }
  const item = await db.loanDeductibleRecord.create({
    data: {
      organizationId: gate.session.organizationId,
      employeeName: body.employeeName,
      employeeNumber: body.employeeNumber || null,
      recordType: body.recordType,
      amount: body.amount,
      description: body.description,
      repaymentNote: body.repaymentNote || null,
      photoUrl,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/loan/${item.publicToken}` });
}
