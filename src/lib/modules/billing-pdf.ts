import { db } from "@/lib/db";
import { formatMoney } from "@/lib/modules/billing-shared";
import { BillingError } from "@/lib/modules/billing";
import { MARGIN, PAGE_W, createBrandedDocument, fit, safe, wrap } from "@/lib/modules/pdf-kit";

type StoredLine = { description: string; quantity: number; unit: string; unitPriceCents: number };

function pretty(iso: string | null | undefined) {
  if (!iso) return "-";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-ZA", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function buildBillingPdf(organizationId: string, id: string) {
  const [docRow, profile] = await Promise.all([
    db.billingDocument.findFirst({ where: { id, organizationId } }),
    db.billingProfile.findUnique({ where: { organizationId } }),
  ]);
  if (!docRow || !profile) throw new BillingError("Document not found");
  const lines = JSON.parse(docRow.linesJson) as StoredLine[];
  const title = docRow.kind === "QUOTE" ? "Quotation" : docRow.chargeVat ? "Tax invoice" : "Invoice";
  const doc = await createBrandedDocument({ organizationId, title, documentNumber: docRow.number });

  doc.heading(profile.tradingName && profile.tradingName !== profile.legalName ? profile.tradingName : profile.legalName);
  doc.field("Legal name", profile.legalName);
  if (profile.registrationNumber) doc.field("Registration", profile.registrationNumber);
  if (profile.vatNumber) doc.field("VAT number", profile.vatNumber);
  if (profile.address) doc.field("Address", profile.address);
  if (profile.email || profile.phone) doc.field("Contact", [profile.email, profile.phone].filter(Boolean).join("  "));

  doc.heading("Prepared for");
  doc.field("Name", docRow.clientName);
  if (docRow.clientCompany) doc.field("Company", docRow.clientCompany);
  if (docRow.clientVatNumber) doc.field("VAT number", docRow.clientVatNumber);
  if (docRow.clientAddress) doc.field("Address", docRow.clientAddress);
  if (docRow.clientEmail || docRow.clientPhone) {
    doc.field("Contact", [docRow.clientEmail, docRow.clientPhone].filter(Boolean).join("  "));
  }

  doc.heading("Document");
  doc.field("Number", docRow.number);
  doc.field("Issued", pretty(docRow.issueDate));
  doc.field(docRow.kind === "QUOTE" ? "Valid until" : "Due", pretty(docRow.dueDate));
  doc.field("Currency", docRow.currency);
  doc.field("Status", docRow.status === "PAID" ? `Paid on ${pretty(docRow.paidOn)}` : docRow.status.toLowerCase());
  if (docRow.theirReference) doc.field("Your reference", docRow.theirReference);
  if (docRow.templateName) doc.field("Template", docRow.templateName);
  if (docRow.paymentMethod || docRow.paymentReference) {
    doc.field("Payment", [docRow.paymentMethod, docRow.paymentReference].filter(Boolean).join("  "));
  }

  doc.heading("Lines");
  const cols = [
    { label: "Description", x: MARGIN, w: 230 },
    { label: "Qty", x: MARGIN + 230, w: 50 },
    { label: "Unit", x: MARGIN + 280, w: 55 },
    { label: "Price", x: MARGIN + 335, w: 80 },
    { label: "Amount", x: MARGIN + 415, w: PAGE_W - MARGIN - (MARGIN + 415) },
  ];
  doc.ensure(18);
  for (const col of cols) {
    doc.page.drawText(col.label, { x: col.x, y: doc.y, size: 9, font: doc.bold, color: doc.primary });
  }
  doc.y -= 8;
  doc.page.drawLine({
    start: { x: MARGIN, y: doc.y },
    end: { x: PAGE_W - MARGIN, y: doc.y },
    thickness: 0.4,
    color: doc.primary,
  });
  doc.y -= 14;

  for (const line of lines) {
    const amount = Math.round(line.quantity * line.unitPriceCents);
    const wrapped = wrap(safe(line.description), doc.font, 9, cols[0].w - 6);
    const height = Math.max(wrapped.length, 1) * 12;
    doc.ensure(height + 4);
    wrapped.forEach((text, index) => {
      doc.page.drawText(text, { x: cols[0].x, y: doc.y - index * 12, size: 9, font: doc.font, color: doc.ink });
    });
    const cells = [
      String(line.quantity),
      line.unit || "-",
      formatMoney(line.unitPriceCents, docRow.currency),
      formatMoney(amount, docRow.currency),
    ];
    cells.forEach((text, index) => {
      const col = cols[index + 1];
      const shown = fit(safe(text), doc.font, 9, col.w - 4);
      const width = doc.font.widthOfTextAtSize(shown, 9);
      const x = index >= 2 ? col.x + col.w - width : col.x;
      doc.page.drawText(shown, { x, y: doc.y, size: 9, font: doc.font, color: doc.ink });
    });
    doc.y -= height + 4;
  }

  doc.ensure(52);
  doc.y -= 4;
  const totalRows = [
    ["Subtotal", formatMoney(docRow.subtotalCents, docRow.currency)],
    ...(docRow.chargeVat ? [[`VAT ${docRow.vatPercent}%`, formatMoney(docRow.vatCents, docRow.currency)]] : []),
    ["Total", formatMoney(docRow.totalCents, docRow.currency)],
  ];
  for (const [label, value] of totalRows) {
    const font = label === "Total" ? doc.bold : doc.font;
    const valueWidth = font.widthOfTextAtSize(value, 10);
    doc.page.drawText(label, { x: MARGIN + 335, y: doc.y, size: 10, font, color: doc.ink });
    doc.page.drawText(value, { x: PAGE_W - MARGIN - valueWidth, y: doc.y, size: 10, font, color: doc.ink });
    doc.y -= 14;
  }

  if (profile.bankName || profile.accountNumber) {
    doc.heading("Pay into");
    if (profile.accountName) doc.field("Account name", profile.accountName);
    if (profile.bankName) doc.field("Bank", profile.bankName);
    if (profile.accountNumber) doc.field("Account number", profile.accountNumber);
    if (profile.branchCode) doc.field("Branch code", profile.branchCode);
    if (profile.accountType) doc.field("Account type", profile.accountType);
  }
  if (docRow.notes) {
    doc.heading("Notes");
    doc.paragraph(docRow.notes);
  }
  if (docRow.terms) {
    doc.heading("Terms");
    doc.paragraph(docRow.terms);
  }
  if (profile.footerNote) {
    doc.y -= 8;
    doc.paragraph(profile.footerNote, { size: 9, color: doc.muted });
  }
  return { bytes: await doc.finish(), fileName: `${docRow.number} ${docRow.clientName}` };
}
