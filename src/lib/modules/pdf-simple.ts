import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/lib/db";

export async function simpleBrandedPdf(input: {
  organizationId: string;
  title: string;
  prefix: string;
  lines: string[];
  /** Reuse an existing number when regenerating a filed PDF later. */
  documentNumber?: string;
}) {
  const branding = await db.organizationBranding.findUniqueOrThrow({
    where: { organizationId: input.organizationId },
  });
  const primary = hex(branding.primaryColor);
  let docNum = input.documentNumber;
  if (!docNum) {
    const seq = await db.documentSequence.upsert({
      where: {
        organizationId_prefix: {
          organizationId: input.organizationId,
          prefix: input.prefix,
        },
      },
      create: {
        organizationId: input.organizationId,
        prefix: input.prefix,
        nextNumber: 2,
      },
      update: { nextNumber: { increment: 1 } },
    });
    docNum = `${input.prefix}-${String(seq.nextNumber - 1).padStart(5, "0")}`;
  }
  const created = new Date();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

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
    y: height - 40,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(input.title, {
    x: 48,
    y: height - 58,
    size: 14,
    font: bold,
    color: rgb(primary.r, primary.g, primary.b),
  });

  let y = height - 110;
  for (const line of input.lines) {
    const chunks = wrap(line, 90);
    for (const c of chunks) {
      if (y < 80) break;
      page.drawText(c, { x: 48, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 14;
    }
    y -= 4;
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

  return { bytes: await pdf.save(), documentNumber: docNum };
}

function hex(h: string) {
  const n = parseInt(h.replace("#", ""), 16);
  if (Number.isNaN(n)) return { r: 0.12, g: 0.23, b: 0.37 };
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function wrap(text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
