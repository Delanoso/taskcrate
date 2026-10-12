import { readFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { db } from "@/lib/db";
import {
  labelKeys,
  parseJsonKeys,
  PERMIT_HAZARDS,
  PERMIT_PPE,
  PERMIT_PRECAUTIONS,
} from "@/lib/modules/permit-options";

type PermitForPdf = {
  organizationId: string;
  title: string;
  documentNumber?: string | null;
  issuerName?: string | null;
  contractorName?: string | null;
  contractorPhone?: string | null;
  specificLocation?: string | null;
  equipmentId?: string | null;
  workDetails?: string | null;
  startAt?: Date | null;
  expiresAt?: Date | null;
  hazardsJson?: string | null;
  lotoConfirmed?: boolean | null;
  barricadesConfirmed?: boolean | null;
  fireExtinguisherOk?: boolean | null;
  precautionsJson?: string | null;
  ppeJson?: string | null;
  areaPhotoUrl?: string | null;
  equipmentPhotoUrl?: string | null;
  completionPhotoUrl?: string | null;
  completionNotes?: string | null;
  managerNotes?: string | null;
  preWorkReceiverSigUrl?: string | null;
  preWorkIssuerSigUrl?: string | null;
  preWorkReceiverSignedAt?: Date | null;
  preWorkIssuerSignedAt?: Date | null;
  postWorkReceiverSigUrl?: string | null;
  postWorkIssuerSigUrl?: string | null;
  postWorkReceiverSignedAt?: Date | null;
  postWorkIssuerSignedAt?: Date | null;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const HEADER_H = 72;
const FOOTER_TOP = 64;
const TIME_ZONE = "Africa/Johannesburg";

export async function nextPermitDocumentNumber(organizationId: string) {
  const seq = await db.documentSequence.upsert({
    where: { organizationId_prefix: { organizationId, prefix: "PTW" } },
    create: { organizationId, prefix: "PTW", nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  return `PTW-${String(seq.nextNumber - 1).padStart(5, "0")}`;
}

export async function buildPermitClosedPdf(permit: PermitForPdf) {
  const branding = await db.organizationBranding.findUniqueOrThrow({
    where: { organizationId: permit.organizationId },
  });
  const docNum =
    permit.documentNumber ?? (await nextPermitDocumentNumber(permit.organizationId));
  const primary = hex(branding.primaryColor);
  const primaryRgb = rgb(primary.r, primary.g, primary.b);
  const ink = rgb(0.15, 0.15, 0.15);
  const muted = rgb(0.45, 0.45, 0.45);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedImage(pdf, branding.logoUrl);
  const created = new Date();
  const documentTitle = `Permit to Work - ${safe(permit.title)}`;
  const footerText = `${fmtDate(created)}  |  ${docNum}  |  ${safe(branding.displayName)}`;

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  function addPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    page.drawRectangle({
      x: 0,
      y: PAGE_H - HEADER_H,
      width: PAGE_W,
      height: HEADER_H,
      color: primaryRgb,
      opacity: 0.08,
    });
    let titleX = MARGIN;
    if (logo) {
      const s = Math.min(90 / logo.width, 44 / logo.height);
      const w = logo.width * s;
      const h = logo.height * s;
      page.drawImage(logo, { x: MARGIN, y: PAGE_H - HEADER_H / 2 - h / 2, width: w, height: h });
      titleX = MARGIN + w + 14;
    }
    page.drawText(fit(documentTitle, bold, 15, PAGE_W - MARGIN - titleX), {
      x: titleX,
      y: PAGE_H - HEADER_H / 2 - 5,
      size: 15,
      font: bold,
      color: primaryRgb,
    });
    page.drawLine({
      start: { x: MARGIN, y: 56 },
      end: { x: PAGE_W - MARGIN, y: 56 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawText(footerText, { x: MARGIN, y: 40, size: 9, font, color: muted });
    y = PAGE_H - HEADER_H - 28;
  }

  function ensure(space: number) {
    if (y - space < FOOTER_TOP) addPage();
  }

  function heading(text: string) {
    ensure(40);
    y -= 6;
    page.drawText(text, { x: MARGIN, y, size: 11, font: bold, color: primaryRgb });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: rgb(primary.r, primary.g, primary.b),
      opacity: 0.4,
    });
    y -= 14;
  }

  function field(label: string, value: string | null | undefined) {
    const labelW = 150;
    const lines = wrap(safe(value || "-"), font, 10, PAGE_W - MARGIN * 2 - labelW);
    ensure(lines.length * 13 + 2);
    page.drawText(label, { x: MARGIN, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
    for (const l of lines) {
      page.drawText(l, { x: MARGIN + labelW, y, size: 10, font, color: ink });
      y -= 13;
    }
    y -= 2;
  }

  function checklist(items: { label: string; on: boolean }[], columns = 1) {
    const colW = (PAGE_W - MARGIN * 2) / columns;
    for (let i = 0; i < items.length; i += columns) {
      ensure(15);
      items.slice(i, i + columns).forEach((item, c) => {
        const x = MARGIN + c * colW;
        page.drawRectangle({
          x,
          y: y - 2,
          width: 9,
          height: 9,
          borderColor: rgb(0.4, 0.4, 0.4),
          borderWidth: 0.7,
          color: item.on ? primaryRgb : undefined,
        });
        page.drawText(fit(safe(item.label), font, 9, colW - 22), {
          x: x + 16,
          y,
          size: 9,
          font,
          color: item.on ? ink : muted,
        });
      });
      y -= 15;
    }
    y -= 2;
  }

  async function imageRow(items: { label: string; url?: string | null }[], boxH: number) {
    const gap = 12;
    const boxW = (PAGE_W - MARGIN * 2 - gap * (items.length - 1)) / items.length;
    ensure(boxH + 22);
    const top = y;
    for (let i = 0; i < items.length; i++) {
      const x = MARGIN + i * (boxW + gap);
      page.drawText(items[i].label, { x, y: top, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
      const boxTop = top - 6;
      page.drawRectangle({
        x,
        y: boxTop - boxH,
        width: boxW,
        height: boxH,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 0.5,
      });
      const img = await embedImage(pdf, items[i].url);
      if (img) {
        const s = Math.min((boxW - 8) / img.width, (boxH - 8) / img.height);
        const w = img.width * s;
        const h = img.height * s;
        page.drawImage(img, {
          x: x + (boxW - w) / 2,
          y: boxTop - boxH + (boxH - h) / 2,
          width: w,
          height: h,
        });
      } else {
        page.drawText("Not provided", {
          x: x + 6,
          y: boxTop - boxH / 2,
          size: 9,
          font,
          color: muted,
        });
      }
    }
    y = top - 6 - boxH - 16;
  }

  async function signatureRow(
    sigs: { role: string; name?: string | null; url?: string | null; at?: Date | null }[],
  ) {
    const boxH = 70;
    ensure(boxH + 60);
    await imageRow(
      sigs.map((s) => ({ label: s.role, url: s.url })),
      boxH,
    );
    y += 10;
    const gap = 12;
    const boxW = (PAGE_W - MARGIN * 2 - gap * (sigs.length - 1)) / sigs.length;
    sigs.forEach((s, i) => {
      const x = MARGIN + i * (boxW + gap);
      page.drawText(fit(`Name: ${safe(s.name || "-")}`, font, 9, boxW), {
        x,
        y,
        size: 9,
        font,
        color: ink,
      });
      page.drawText(`Signed: ${s.at ? fmtDateTime(s.at) : "-"}`, {
        x,
        y: y - 12,
        size: 9,
        font,
        color: muted,
      });
    });
    y -= 32;
  }

  addPage();

  heading("1. Administrative tracking");
  field("Permit number", docNum);
  field("Permit issuer", permit.issuerName);
  field("Permit receiver", permit.contractorName);
  field("Receiver phone", permit.contractorPhone);
  field("Start time", permit.startAt ? fmtDateTime(permit.startAt) : null);
  field("Expiry time", permit.expiresAt ? fmtDateTime(permit.expiresAt) : null);

  heading("2. Location & job scope");
  field("Specific location", permit.specificLocation);
  field("Equipment ID", permit.equipmentId);
  field("Task description", permit.workDetails);

  heading("3. Hazard identification");
  const hazards = new Set(parseJsonKeys(permit.hazardsJson));
  checklist(
    PERMIT_HAZARDS.map((h) => ({ label: h.label, on: hazards.has(h.key) })),
    2,
  );

  heading("4. Precautions & risk controls");
  const precautions = new Set(
    permit.precautionsJson
      ? parseJsonKeys(permit.precautionsJson)
      : [
          permit.lotoConfirmed && "loto",
          permit.barricadesConfirmed && "barricades",
          permit.fireExtinguisherOk && "extinguisher",
        ].filter((k): k is string => !!k),
  );
  checklist(
    PERMIT_PRECAUTIONS.map((p) => ({ label: p.label, on: precautions.has(p.key) })),
    2,
  );
  const ppe = parseJsonKeys(permit.ppeJson);
  field("Mandatory PPE", ppe.length ? labelKeys(ppe, PERMIT_PPE).join(", ") : "None selected");

  heading("5. Photo evidence");
  await imageRow(
    [
      { label: "Work area", url: permit.areaPhotoUrl },
      { label: "Safety equipment", url: permit.equipmentPhotoUrl },
      { label: "Completion", url: permit.completionPhotoUrl },
    ],
    130,
  );

  heading("6. Pre-work sign-off");
  field("Declaration", "Both parties verified conditions on the ground before work started.");
  await signatureRow([
    {
      role: "Receiver signature",
      name: permit.contractorName,
      url: permit.preWorkReceiverSigUrl,
      at: permit.preWorkReceiverSignedAt,
    },
    {
      role: "Issuer signature",
      name: permit.issuerName,
      url: permit.preWorkIssuerSigUrl,
      at: permit.preWorkIssuerSignedAt,
    },
  ]);

  heading("7. Post-work close-out");
  field(
    "Declaration",
    "Tools cleared, area clean, and the machine is safe to power back up.",
  );
  field("Close-out notes", permit.completionNotes);
  if (permit.managerNotes) field("Issuer notes", permit.managerNotes);
  await signatureRow([
    {
      role: "Receiver signature",
      name: permit.contractorName,
      url: permit.postWorkReceiverSigUrl,
      at: permit.postWorkReceiverSignedAt,
    },
    {
      role: "Issuer signature",
      name: permit.issuerName,
      url: permit.postWorkIssuerSigUrl,
      at: permit.postWorkIssuerSignedAt,
    },
  ]);

  if (pages.length > 1) {
    pages.forEach((p, i) => {
      const label = `Page ${i + 1} of ${pages.length}`;
      p.drawText(label, {
        x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 9),
        y: 40,
        size: 9,
        font,
        color: muted,
      });
    });
  }

  return { bytes: await pdf.save(), documentNumber: docNum };
}

/** Loads a PNG/JPEG from a data URL or a /uploads path; other formats are skipped. */
async function embedImage(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
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
function safe(text: string) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r?\n/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
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

function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t}...`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-ZA", { timeZone: TIME_ZONE });
}

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-ZA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hex(h: string) {
  const n = parseInt(h.replace("#", ""), 16);
  if (Number.isNaN(n)) return { r: 0.12, g: 0.23, b: 0.37 };
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
