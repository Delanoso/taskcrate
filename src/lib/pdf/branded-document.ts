import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/lib/db";

export type BrandedPdfInput = {
  organizationId: string;
  documentTitle: string;
  bodyLines: string[];
  prefix?: string;
};

export async function createBrandedPdf(input: BrandedPdfInput): Promise<{
  bytes: Uint8Array;
  documentNumber: string;
}> {
  const branding = await db.organizationBranding.findUnique({
    where: { organizationId: input.organizationId },
    include: { organization: true },
  });

  if (!branding) throw new Error("Organization branding not found");

  const prefix = input.prefix ?? "DOC";
  const seq = await db.documentSequence.upsert({
    where: {
      organizationId_prefix: {
        organizationId: input.organizationId,
        prefix,
      },
    },
    create: {
      organizationId: input.organizationId,
      prefix,
      nextNumber: 2,
    },
    update: { nextNumber: { increment: 1 } },
  });

  const docNum = `${prefix}-${String(seq.nextNumber - 1).padStart(5, "0")}`;
  const created = new Date();
  const primary = hexToRgb(branding.primaryColor);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height, width } = page.getSize();

  page.drawRectangle({
    x: 0,
    y: height - 72,
    width,
    height: 72,
    color: rgb(primary.r, primary.g, primary.b),
    opacity: 0.08,
  });

  page.drawText(branding.displayName, {
    x: 48,
    y: height - 48,
    size: 11,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawText(input.documentTitle, {
    x: 48,
    y: height - 68,
    size: 16,
    font: fontBold,
    color: rgb(primary.r, primary.g, primary.b),
  });

  let y = height - 120;
  for (const line of input.bodyLines) {
    page.drawText(line, { x: 48, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;
    if (y < 100) break;
  }

  const footer = `${created.toLocaleDateString()} · ${docNum} · ${branding.displayName}`;
  page.drawLine({
    start: { x: 48, y: 56 },
    end: { x: width - 48, y: 56 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText(footer, {
    x: 48,
    y: 40,
    size: 9,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  const bytes = await pdf.save();
  return { bytes, documentNumber: docNum };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return { r: 0.12, g: 0.23, b: 0.37 };
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}
