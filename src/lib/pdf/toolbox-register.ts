import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/lib/db";

export async function createToolboxRegisterPdf(talkId: string) {
  const talk = await db.toolboxTalk.findUniqueOrThrow({
    where: { id: talkId },
    include: {
      attendances: { orderBy: { signedAt: "asc" } },
      organization: { include: { branding: true } },
    },
  });

  const branding = talk.organization.branding;
  if (!branding) throw new Error("Missing branding");

  const primary = hexToRgb(branding.primaryColor);
  const seq = await db.documentSequence.upsert({
    where: {
      organizationId_prefix: {
        organizationId: talk.organizationId,
        prefix: "TBT",
      },
    },
    create: { organizationId: talk.organizationId, prefix: "TBT", nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  const docNum = `TBT-${String(seq.nextNumber - 1).padStart(5, "0")}`;
  const created = new Date();

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]);
  let { height, width } = page.getSize();

  function drawHeader(p: typeof page) {
    p.drawRectangle({
      x: 0,
      y: height - 72,
      width,
      height: 72,
      color: rgb(primary.r, primary.g, primary.b),
      opacity: 0.08,
    });
    p.drawText(branding!.displayName, {
      x: 48,
      y: height - 40,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    p.drawText("Toolbox Talk — Signed Attendance Register", {
      x: 48,
      y: height - 58,
      size: 14,
      font: fontBold,
      color: rgb(primary.r, primary.g, primary.b),
    });
  }

  function drawFooter(p: typeof page) {
    const footer = `${created.toLocaleDateString()} · ${docNum} · ${branding!.displayName}`;
    p.drawLine({
      start: { x: 48, y: 56 },
      end: { x: width - 48, y: 56 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    p.drawText(footer, {
      x: 48,
      y: 40,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  drawHeader(page);
  drawFooter(page);

  let y = height - 100;
  const meta = [
    `Talk: ${talk.title}`,
    `Week: ${talk.weekLabel}`,
    `Attendees: ${talk.attendances.length}`,
    `Status: ${talk.status}`,
  ];
  for (const line of meta) {
    page.drawText(line, { x: 48, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 16;
  }

  y -= 12;
  page.drawText("Name", { x: 48, y, size: 10, font: fontBold });
  page.drawText("Signed at", { x: 280, y, size: 10, font: fontBold });
  page.drawText("Signature", { x: 420, y, size: 10, font: fontBold });
  y -= 8;
  page.drawLine({
    start: { x: 48, y },
    end: { x: width - 48, y },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });
  y -= 22;

  for (const a of talk.attendances) {
    if (y < 100) {
      page = pdf.addPage([595, 842]);
      ({ height, width } = page.getSize());
      drawHeader(page);
      drawFooter(page);
      y = height - 100;
    }

    const name = `${a.firstName} ${a.lastName}`;
    page.drawText(name.slice(0, 36), { x: 48, y, size: 10, font });
    page.drawText(a.signedAt.toLocaleString(), { x: 280, y, size: 9, font });

    try {
      const base64 = a.signatureData.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Buffer.from(base64, "base64");
      const png = await pdf.embedPng(bytes);
      const sigH = 28;
      const sigW = (png.width / png.height) * sigH;
      page.drawImage(png, { x: 420, y: y - 8, width: Math.min(sigW, 120), height: sigH });
    } catch {
      page.drawText("(signature)", { x: 420, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
    }
    y -= 40;
  }

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
