import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { db } from "@/lib/db";

export const PAGE_W = 595;
export const PAGE_H = 842;
export const MARGIN = 48;
const HEADER_H = 72;
const FOOTER_TOP = 64;
const TIME_ZONE = "Africa/Johannesburg";

export async function nextDocumentNumber(organizationId: string, prefix: string) {
  const seq = await db.documentSequence.upsert({
    where: { organizationId_prefix: { organizationId, prefix } },
    create: { organizationId, prefix, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  return `${prefix}-${String(seq.nextNumber - 1).padStart(5, "0")}`;
}

/** A4 document with the tenant's logo header, footer and page numbers; layout helpers track the cursor. */
export async function createBrandedDocument(input: {
  organizationId: string;
  title: string;
  documentNumber: string;
}) {
  const branding = await db.organizationBranding.findUniqueOrThrow({
    where: { organizationId: input.organizationId },
  });
  const primary = hex(branding.primaryColor);
  const primaryRgb = rgb(primary.r, primary.g, primary.b);
  const ink = rgb(0.15, 0.15, 0.15);
  const muted = rgb(0.45, 0.45, 0.45);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedImage(pdf, branding.logoUrl);
  const footerText = `${fmtDate(new Date())}  |  ${input.documentNumber}  |  ${safe(branding.displayName)}`;

  const pages: PDFPage[] = [];
  const doc = {
    pdf,
    font,
    bold,
    primary: primaryRgb,
    ink,
    muted,
    companyName: branding.displayName,
    page: undefined as unknown as PDFPage,
    y: 0,

    addPage() {
      const page = pdf.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      doc.page = page;
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: primaryRgb, opacity: 0.08 });
      let titleX = MARGIN;
      if (logo) {
        const s = Math.min(90 / logo.width, 44 / logo.height);
        const w = logo.width * s;
        const h = logo.height * s;
        page.drawImage(logo, { x: MARGIN, y: PAGE_H - HEADER_H / 2 - h / 2, width: w, height: h });
        titleX = MARGIN + w + 14;
      }
      page.drawText(fit(safe(input.title), bold, 15, PAGE_W - MARGIN - titleX), {
        x: titleX,
        y: PAGE_H - HEADER_H / 2 - 5,
        size: 15,
        font: bold,
        color: primaryRgb,
      });
      page.drawLine({ start: { x: MARGIN, y: 56 }, end: { x: PAGE_W - MARGIN, y: 56 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      page.drawText(footerText, { x: MARGIN, y: 40, size: 9, font, color: muted });
      doc.y = PAGE_H - HEADER_H - 28;
    },

    ensure(space: number) {
      if (doc.y - space < FOOTER_TOP) doc.addPage();
    },

    heading(text: string, size = 11) {
      doc.ensure(44);
      doc.y -= 6;
      doc.page.drawText(fit(safe(text), bold, size, PAGE_W - MARGIN * 2), { x: MARGIN, y: doc.y, size, font: bold, color: primaryRgb });
      doc.y -= 6;
      doc.page.drawLine({ start: { x: MARGIN, y: doc.y }, end: { x: PAGE_W - MARGIN, y: doc.y }, thickness: 0.5, color: primaryRgb, opacity: 0.4 });
      doc.y -= 14;
    },

    field(label: string, value: string | null | undefined, labelW = 150) {
      const lines = wrap(safe(value || "-"), font, 10, PAGE_W - MARGIN * 2 - labelW);
      doc.ensure(lines.length * 13 + 2);
      doc.page.drawText(label, { x: MARGIN, y: doc.y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
      for (const l of lines) {
        doc.page.drawText(l, { x: MARGIN + labelW, y: doc.y, size: 10, font, color: ink });
        doc.y -= 13;
      }
      doc.y -= 2;
    },

    paragraph(text: string, opts: { size?: number; indent?: number; color?: RGB; font?: PDFFont } = {}) {
      const size = opts.size ?? 10;
      const indent = opts.indent ?? 0;
      const f = opts.font ?? font;
      const lines = wrap(safe(text), f, size, PAGE_W - MARGIN * 2 - indent);
      for (const l of lines) {
        doc.ensure(size + 4);
        doc.page.drawText(l, { x: MARGIN + indent, y: doc.y, size, font: f, color: opts.color ?? ink });
        doc.y -= size + 3;
      }
    },

    /** Row of images scaled into equal boxes; missing/unsupported images are skipped. */
    async imageRow(urls: string[], boxH: number, indent = 0) {
      const images = (await Promise.all(urls.map((u) => embedImage(pdf, u)))).filter((i): i is PDFImage => !!i);
      if (!images.length) return;
      const gap = 8;
      const perRow = 4;
      const boxW = (PAGE_W - MARGIN * 2 - indent - gap * (perRow - 1)) / perRow;
      doc.ensure(boxH + 8);
      images.forEach((img, i) => {
        const x = MARGIN + indent + i * (boxW + gap);
        const s = Math.min(boxW / img.width, boxH / img.height);
        doc.page.drawImage(img, { x, y: doc.y - img.height * s, width: img.width * s, height: img.height * s });
      });
      doc.y -= boxH + 8;
    },

    async finish() {
      pages.forEach((p, i) => {
        const label = `Page ${i + 1} of ${pages.length}`;
        p.drawText(label, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 9), y: 40, size: 9, font, color: muted });
      });
      return pdf.save();
    },
  };
  doc.addPage();
  return doc;
}

/** Loads a PNG/JPEG from a data URL or a /uploads path; other formats are skipped. */
export async function embedImage(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    let bytes: Buffer;
    const m = /^data:image\/[\w.+-]+;base64,(.+)$/.exec(url);
    if (m) {
      bytes = Buffer.from(m[1], "base64");
    } else if (url.startsWith("/uploads/")) {
      const publicDir = path.join(process.cwd(), "public");
      const filePath = path.join(publicDir, url);
      if (!filePath.startsWith(publicDir + path.sep)) return null;
      bytes = await readFile(filePath);
    } else {
      return null;
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
    return null;
  } catch {
    return null;
  }
}

/** Standard PDF fonts only cover WinAnsi; drop anything else (emoji, arrows, etc). */
export function safe(text: string) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r?\n/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : ["-"];
}

export function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t}...`;
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString("en-ZA", { timeZone: TIME_ZONE });
}

export function fmtDateTime(d: Date) {
  return d.toLocaleString("en-ZA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hex(h: string) {
  const n = parseInt(h.replace("#", ""), 16);
  if (Number.isNaN(n)) return { r: 0.12, g: 0.23, b: 0.37 };
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
