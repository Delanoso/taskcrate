import type { OnboardingDocument, OnboardingPacket } from "@/generated/prisma/client";
import { createBrandedDocument, fmtDate, fmtDateTime } from "@/lib/modules/pdf-kit";
import { itemLabel, type Personal } from "@/lib/modules/onboard-items";
import { decrypt, readBank } from "@/lib/modules/onboard-server";
import { jsonList } from "@/lib/modules/common";

/** Employee information sheet for payroll / personnel file, including bank details. */
export async function buildInfoSheet(p: OnboardingPacket & { documents: OnboardingDocument[] }, documentNumber: string) {
  const personal = decrypt<Personal>(p.personalJson);
  const bank = readBank(p.bankJson);
  const doc = await createBrandedDocument({ organizationId: p.organizationId, title: `Employee Information - ${p.employeeName}`, documentNumber });

  doc.heading("Employment");
  doc.field("Employee", personal ? `${personal.firstNames} ${personal.surname}` : p.employeeName);
  doc.field("Employee number", p.employeeNumber);
  doc.field("Job title", p.jobTitle);
  doc.field("Department", p.department);
  doc.field("Start date", p.startDate ? fmtDate(p.startDate) : null);

  doc.heading("Personal details");
  if (!personal) doc.paragraph("Not captured.", { color: doc.muted });
  else {
    doc.field("First names", personal.firstNames);
    doc.field("Surname", personal.surname);
    if (personal.preferredName) doc.field("Known as", personal.preferredName);
    doc.field(personal.idType === "sa_id" ? "SA ID number" : "Passport number", personal.idNumber);
    if (personal.idType === "passport") doc.field("Issued by", personal.passportCountry);
    doc.field("Date of birth", personal.dateOfBirth);
    doc.field("Gender", personal.gender);
    doc.field("Nationality", personal.nationality);
    doc.field("Tax number", personal.taxNumber);
    doc.field("Cellphone", personal.cellphone);
    doc.field("Email", personal.email);
    doc.field("Home address", `${personal.homeAddress}${personal.postalCode ? `, ${personal.postalCode}` : ""}`);
    doc.heading("Emergency contact");
    doc.field("Name", personal.emergencyName);
    doc.field("Relationship", personal.emergencyRelationship);
    doc.field("Phone", personal.emergencyPhone);
  }

  doc.heading("Bank details (confidential)");
  if (!bank) doc.paragraph("Not captured.", { color: doc.muted });
  else {
    doc.field("Bank", bank.bankName);
    doc.field("Account holder", bank.accountHolder);
    doc.field("Account number", bank.accountNumber);
    doc.field("Account type", bank.accountType);
    doc.field("Branch code", bank.branchCode);
  }

  doc.heading("Documents received");
  const keys = jsonList(p.requirementsJson);
  for (const k of keys) {
    const files = p.documents.filter((d) => d.itemKey === k);
    doc.field(itemLabel(k), files.length ? files.map((f) => f.fileName).join(", ") : "MISSING", 200);
  }

  doc.heading("Declaration (POPIA consent)");
  doc.paragraph(
    "I confirm that the information I supplied is true and correct, and I consent to the company processing my personal information for employment, payroll, tax, benefits and legal compliance purposes in terms of the Protection of Personal Information Act.",
    { size: 9 },
  );
  doc.y -= 6;
  await doc.signatures([
    { label: "Employee", name: p.consentName, date: p.consentAt, url: p.consentSignature, note: p.consentAt ? "" : "Not signed" },
    { label: "Approved by", name: p.reviewedBy, date: p.status === "approved" ? p.reviewedAt : null },
  ]);
  if (p.submittedAt) doc.paragraph(`Submitted ${fmtDateTime(p.submittedAt)}`, { size: 8, color: doc.muted });
  return doc.finish();
}
