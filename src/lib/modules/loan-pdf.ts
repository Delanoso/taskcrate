import type { LoanDeductibleRecord } from "@/generated/prisma/client";
import { createBrandedDocument, fmtDateTime, nextDocumentNumber } from "@/lib/modules/pdf-kit";

export async function buildLoanPdf(item: LoanDeductibleRecord) {
  const documentNumber = await nextDocumentNumber(item.organizationId, "AOD");
  const title = item.recordType === "loan" ? "Acknowledgment of debt" : "Incident deductible consent";
  const doc = await createBrandedDocument({
    organizationId: item.organizationId,
    title,
    documentNumber,
  });
  doc.heading("Record");
  doc.field("Employee", item.employeeName);
  doc.field("Employee number", item.employeeNumber);
  doc.field("Type", item.recordType === "loan" ? "Loan or advance" : "Incident deductible");
  doc.field("Amount", `R ${item.amount.toLocaleString("en-ZA")}`);
  doc.field("Opened", fmtDateTime(item.createdAt));
  doc.field("Description", item.description);
  doc.field("Comes off the payslip", item.repaymentNote);
  if (item.photoUrl) {
    doc.heading("Photo");
    await doc.imageRow([item.photoUrl], 140);
  }
  doc.heading("Consent");
  doc.paragraph("I agree that this amount may be deducted from my pay as described above.");
  await doc.signatures([
    item.signedAt
      ? { label: "Employee", name: item.employeeName, date: item.signedAt, url: item.signatureData }
      : { label: "Employee", note: "Awaiting signature" },
  ]);
  return { bytes: await doc.finish(), documentNumber };
}
