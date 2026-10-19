import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const doc = await db.billingDocument.findFirst({
    where: { publicToken: (await params).token },
    include: { organization: { include: { branding: true } } },
  });
  if (!doc) return NextResponse.json({ error: "This link is not active" }, { status: 404 });
  let lines: { description: string; quantity: number; unit: string; unitPriceCents: number }[] = [];
  try {
    const parsed = JSON.parse(doc.linesJson);
    if (Array.isArray(parsed)) lines = parsed;
  } catch {
    lines = [];
  }
  return NextResponse.json({
    company: doc.organization.branding?.displayName ?? doc.organization.name,
    kind: doc.kind,
    number: doc.number,
    status: doc.status,
    clientName: doc.clientName,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    currency: doc.currency,
    totalCents: doc.totalCents,
    notes: doc.notes,
    lines: lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
    })),
  });
}
