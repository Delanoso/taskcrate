import { requireProductApi } from "@/lib/modules/api-guard";
import { billingSnapshot } from "@/lib/modules/billing";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi("quotations");
  if ("error" in gate) return gate.error;
  const { documents } = await billingSnapshot(gate.session.organizationId);
  const rows = documents.map((doc) => [
    doc.kind === "QUOTE" ? "Quotation" : "Invoice",
    doc.number,
    doc.status,
    doc.clientName,
    doc.clientCompany ?? "",
    doc.clientEmail ?? "",
    doc.clientPhone ?? "",
    doc.currency,
    doc.issueDate,
    doc.dueDate ?? "",
    doc.theirReference ?? "",
    doc.subtotalCents / 100,
    doc.vatCents / 100,
    doc.totalCents / 100,
    doc.paidOn ?? "",
    doc.paymentMethod ?? "",
    doc.paymentReference ?? "",
    doc.templateName ?? "",
  ]);
  const bytes = buildXlsx({
    sheetName: "Quotes and invoices",
    headers: [
      "Type",
      "Number",
      "Status",
      "Client",
      "Company",
      "Email",
      "Phone",
      "Currency",
      "Issued",
      "Due",
      "Their reference",
      "Subtotal",
      "VAT",
      "Total",
      "Paid on",
      "Payment method",
      "Payment reference",
      "Template",
    ],
    rows,
    widths: [12, 14, 12, 24, 24, 24, 16, 10, 12, 12, 18, 12, 12, 12, 12, 16, 18, 22],
  });
  return xlsxResponse(bytes, "Quotations and invoices");
}
