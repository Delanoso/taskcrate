import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BillingPayment } from "@/generated/prisma/client";
import { getProduct } from "@/data/products";
import { jsonList } from "@/lib/modules/common";
import { fmtDate, safe } from "@/lib/modules/pdf-kit";

const NAVY = rgb(0.118, 0.227, 0.373);
const INK = rgb(0.15, 0.15, 0.15);
const MUTED = rgb(0.45, 0.45, 0.45);

/** TaskCrate's own invoice to the company (not tenant-branded). Becomes a tax invoice once a VAT number is set. */
export async function buildInvoicePdf(p: BillingPayment, customer: { name: string; email: string | null }) {
  const vat = process.env.TASKCRATE_VAT_NUMBER?.trim();
  const supplier = process.env.TASKCRATE_LEGAL_NAME?.trim() || "Delano Solutions";
  const address = process.env.TASKCRATE_ADDRESS?.trim();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  const L = 48;
  let y = 790;
  const text = (s: string, x: number, size = 10, f = font, color = INK) => page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: string, xr: number, size = 10, f = font, color = INK) => page.drawText(safe(s), { x: xr - f.widthOfTextAtSize(safe(s), size), y, size, font: f, color });

  page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: NAVY });
  y = 805;
  page.drawText("TaskCrate", { x: L, y, size: 22, font: bold, color: rgb(1, 1, 1) });
  right(vat ? "TAX INVOICE" : "INVOICE", 547, 16, bold, rgb(1, 1, 1));
  y = 782;
  page.drawText(safe(`${supplier} · taskcrate.co.za · hello@taskcrate.co.za`), { x: L, y, size: 9, font, color: rgb(0.85, 0.9, 1) });

  y = 725;
  text("Billed to", L, 9, bold, MUTED);
  text("Invoice", 360, 9, bold, MUTED);
  y -= 15;
  text(customer.name, L, 11, bold);
  text(p.invoiceNumber, 360, 10);
  y -= 14;
  if (customer.email) text(customer.email, L);
  text(`Date: ${fmtDate(p.createdAt)}`, 360);
  y -= 14;
  text(`Period: ${p.periodLabel}`, 360);
  y -= 14;
  text(`PayFast ref: ${p.providerRef}`, 360, 9, font, MUTED);
  if (vat || address) {
    y -= 22;
    text("Supplier", L, 9, bold, MUTED);
    y -= 14;
    text(supplier, L);
    if (address) { y -= 13; text(address, L, 9, font, MUTED); }
    if (vat) { y -= 13; text(`VAT number: ${vat}`, L, 9, font, MUTED); }
  }

  y -= 40;
  page.drawLine({ start: { x: L, y: y + 14 }, end: { x: 547, y: y + 14 }, thickness: 0.6, color: NAVY });
  text("Description", L, 9, bold, NAVY);
  right("Amount", 547, 9, bold, NAVY);
  y -= 8;
  page.drawLine({ start: { x: L, y }, end: { x: 547, y }, thickness: 0.4, color: rgb(0.8, 0.8, 0.8) });
  const apps = jsonList(p.appsJson);
  const each = Math.round((p.amountGross / Math.max(apps.length, 1)) * 100) / 100;
  apps.forEach((slug, i) => {
    y -= 18;
    const amount = i === apps.length - 1 ? p.amountGross - each * (apps.length - 1) : each;
    text(`${getProduct(slug)?.name ?? slug} - ${p.kind === "first" ? "first month (pro rata)" : "monthly rent"}`, L);
    right(`R ${amount.toFixed(2)}`, 547);
  });
  y -= 14;
  page.drawLine({ start: { x: 330, y }, end: { x: 547, y }, thickness: 0.4, color: rgb(0.8, 0.8, 0.8) });
  if (vat) {
    const excl = Math.round((p.amountGross / 1.15) * 100) / 100;
    y -= 16; text("Total excl. VAT", 330); right(`R ${excl.toFixed(2)}`, 547);
    y -= 16; text("VAT (15%)", 330); right(`R ${(p.amountGross - excl).toFixed(2)}`, 547);
  }
  y -= 18;
  text("Total paid", 330, 11, bold);
  right(`R ${p.amountGross.toFixed(2)}`, 547, 11, bold);

  y -= 40;
  text("Paid by card through PayFast. Thank you.", L, 9, font, MUTED);
  if (p.sandbox) { y -= 14; text("TEST PAYMENT (PayFast sandbox) - not a real charge.", L, 9, bold, rgb(0.75, 0.1, 0.1)); }
  page.drawText(safe(`${p.invoiceNumber} · ${supplier}`), { x: L, y: 40, size: 8, font, color: MUTED });
  return pdf.save();
}
