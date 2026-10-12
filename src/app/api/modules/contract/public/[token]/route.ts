import { NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.contractDocument.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    contract: {
      title: item.title,
      bodyText: item.bodyText,
      status: item.status,
      companyName: item.organization.branding?.displayName ?? item.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.contractDocument.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    employeeName: z.string().min(2),
    signatureData: z.string().startsWith("data:image/"),
  }).parse(await req.json());

  await db.contractDocument.update({
    where: { id: item.id },
    data: {
      employeeName: body.employeeName,
      signatureData: body.signatureData,
      status: "signed",
      signedAt: new Date(),
    },
  });

  // Build multi-page PDF and stamp signature on every page footer block
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const paragraphs = item.bodyText.split(/\n+/);
  const pagesNeeded = Math.max(2, Math.ceil(paragraphs.length / 20));
  const sigBytes = Buffer.from(body.signatureData.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const png = await pdf.embedPng(sigBytes).catch(() => null);
  const company = item.organization.branding?.displayName ?? item.organization.name;

  for (let i = 0; i < pagesNeeded; i++) {
    const page = pdf.addPage([595, 842]);
    const { height, width } = page.getSize();
    page.drawText(item.title, { x: 48, y: height - 50, size: 14, font: bold });
    page.drawText(`${company} · page ${i + 1}/${pagesNeeded}`, { x: 48, y: height - 68, size: 9, font, color: rgb(0.4,0.4,0.4) });
    let y = height - 100;
    const slice = paragraphs.slice(i * 20, i * 20 + 20);
    for (const line of slice) {
      page.drawText(line.slice(0, 95), { x: 48, y, size: 10, font });
      y -= 16;
    }
    page.drawText("Employee signature block", { x: 48, y: 90, size: 9, font });
    if (png) page.drawImage(png, { x: 48, y: 40, width: 120, height: 36 });
    page.drawText(body.employeeName, { x: 180, y: 50, size: 10, font });
    page.drawText(new Date().toLocaleDateString(), { x: width - 140, y: 40, size: 9, font });
  }

  const bytes = await pdf.save();
  return NextResponse.json({
    ok: true,
    pdfBase64: Buffer.from(bytes).toString("base64"),
  });
}
