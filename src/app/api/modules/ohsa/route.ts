import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { simpleBrandedPdf } from "@/lib/modules/pdf-simple";

export const OHSA_ITEMS = [
  { id: "exits", label: "Emergency exits clear and signed", weight: 15 },
  { id: "firstaid", label: "First aid boxes checked & stocked", weight: 15 },
  { id: "fire", label: "Fire extinguishers inspected", weight: 15 },
  { id: "electrical", label: "Electrical panels accessible & labeled", weight: 10 },
  { id: "housekeeping", label: "Housekeeping / walkways clear", weight: 10 },
  { id: "ppe", label: "PPE stations stocked", weight: 10 },
  { id: "signage", label: "Mandatory safety signage visible", weight: 10 },
  { id: "chemical", label: "Chemical storage compliant", weight: 15 },
];

export async function GET() {
  const gate = await requireProductApi("ohsa-mock-auditor");
  if ("error" in gate) return gate.error;
  const items = await db.ohsaAudit.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items, checklist: OHSA_ITEMS });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("ohsa-mock-auditor");
  if ("error" in gate) return gate.error;
  const body = z.object({
    title: z.string().min(2),
    monthLabel: z.string().min(2),
    answers: z.array(z.object({
      id: z.string(),
      pass: z.boolean(),
      photoUrl: z.string().optional(),
      notes: z.string().optional(),
    })),
  }).parse(await req.json());
  let score = 0;
  let max = 0;
  for (const item of OHSA_ITEMS) {
    max += item.weight;
    const a = body.answers.find((x) => x.id === item.id);
    if (a?.pass) score += item.weight;
  }
  const pct = max ? Math.round((score / max) * 1000) / 10 : 0;
  const audit = await db.ohsaAudit.create({
    data: {
      organizationId: gate.session.organizationId,
      title: body.title,
      monthLabel: body.monthLabel,
      answersJson: JSON.stringify(body.answers),
      score: pct,
      status: "completed",
    },
  });
  const pdf = await simpleBrandedPdf({
    organizationId: gate.session.organizationId,
    title: `OHSA Mock Audit — ${audit.title}`,
    prefix: "OHSA",
    lines: [
      `Month: ${audit.monthLabel}`,
      `Weighted health score: ${pct}%`,
      ...OHSA_ITEMS.map((i) => {
        const a = body.answers.find((x) => x.id === i.id);
        return `${i.label}: ${a?.pass ? "PASS" : "FAIL"}${a?.notes ? ` (${a.notes})` : ""}`;
      }),
    ],
  });
  return NextResponse.json({ audit, pdf: { documentNumber: pdf.documentNumber }, pdfBytesBase64: Buffer.from(pdf.bytes).toString("base64") });
}
