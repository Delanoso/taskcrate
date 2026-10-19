import type { AodPayment, LoanDeductibleRecord } from "@/generated/prisma/client";
import { companyName } from "@/lib/modules/common";
import { createBrandedDocument, fit, fmtDate, fmtDateTime, MARGIN, PAGE_W, safe } from "@/lib/modules/pdf-kit";
import { STATUS_LABEL, methodLabel, money, periodLabel } from "@/lib/modules/aod-options";
import { serializeAod, termsFor } from "@/lib/modules/aod-server";

export async function buildAodPdf(r: LoanDeductibleRecord & { payments: AodPayment[] }) {
  const s = serializeAod(r);
  const company = await companyName(r.organizationId);
  const doc = await createBrandedDocument({
    organizationId: r.organizationId,
    title: `Acknowledgement of Debt - ${r.employeeName}`,
    documentNumber: r.reference ?? "AOD",
  });

  doc.heading("Employee");
  doc.field("Name", r.employeeName);
  doc.field("Employee number", r.employeeNumber);
  doc.field("ID number", r.employeeIdNumber);
  doc.field("Cellphone", r.employeePhone);

  doc.heading("Debt");
  doc.field("Reason", s.reasonText);
  doc.field("Type", s.kind === "deductible" ? "Loss or damage (BCEA s34(2))" : "Loan / amount owed");
  doc.field("Amount", money(r.amount));
  doc.field("Details", r.description);
  if (s.incidentDate) doc.field("Date of incident", fmtDate(new Date(`${s.incidentDate}T12:00:00+02:00`)));
  doc.field("Repayment", s.instalmentAmount ? `${money(s.instalmentAmount)} a month x ${s.instalments}, from ${periodLabel(s.firstPeriod!)}` : r.repaymentNote);
  doc.field("Paid by", methodLabel(r.repayMethod));
  if (r.sourceRef) doc.field("Source", r.sourceRef);
  if (s.photos.length) {
    doc.y -= 4;
    await doc.imageRow(s.photos.slice(0, 4), 100);
  }

  doc.heading("Acknowledgement");
  termsFor(r, company).forEach((t, i) => {
    doc.paragraph(`${i + 1}.  ${t}`, { size: 9 });
    doc.y -= 2;
  });
  doc.y -= 6;
  doc.ensure(150);
  await doc.signatures([
    r.signedAt
      ? { label: "Employee", name: r.signerName ?? r.employeeName, date: r.signedAt, url: r.signatureData }
      : { label: "Employee", name: r.employeeName, note: r.status === "declined" ? "Declined" : "Not signed yet" },
    { label: `For ${company}`, name: r.employerSignerName ?? r.issuedBy, date: r.createdAt, url: r.employerSignature },
  ]);
  if (r.signedAt) doc.paragraph(`Signed electronically on ${fmtDateTime(r.signedAt)}${r.signIp ? ` from IP ${r.signIp}` : ""}.`, { size: 8, color: doc.muted });
  if (r.declinedAt) doc.paragraph(`Declined on ${fmtDateTime(r.declinedAt)}: ${r.declineReason ?? ""}`, { size: 9 });

  doc.heading("Statement");
  doc.field("Status", STATUS_LABEL[s.status] ?? s.status);
  doc.field("Paid to date", money(s.paid));
  doc.field("Balance", money(s.balance));
  if (s.arrears) doc.field("In arrears", money(s.arrears));
  if (s.schedule.length) {
    doc.y -= 4;
    const cols = [{ label: "Month", w: 140 }, { label: "Instalment", w: 110 }, { label: "Paid", w: 110 }, { label: "", w: 0 }];
    cols[3].w = PAGE_W - MARGIN * 2 - 360;
    const row = (cells: string[], head = false) => {
      doc.ensure(15);
      let x = MARGIN;
      cells.forEach((c, i) => {
        const f = head ? doc.bold : doc.font;
        doc.page.drawText(fit(safe(c), f, 8.5, cols[i].w - 6), { x, y: doc.y, size: 8.5, font: f, color: head ? doc.primary : doc.ink });
        x += cols[i].w;
      });
      doc.y -= 13;
    };
    row(cols.map((c) => c.label), true);
    for (const p of s.schedule) row([periodLabel(p.period), money(p.amount), money(p.paid), p.state === "paid" ? "Paid" : p.state === "late" ? "Late" : p.state === "due" ? "Due" : ""]);
  }
  if (s.payments.length) {
    doc.y -= 6;
    doc.paragraph("Payments received", { font: doc.bold, size: 9 });
    for (const p of s.payments) doc.paragraph(`${fmtDate(new Date(`${p.paidOn}T12:00:00+02:00`))}  ${money(p.amount)}  ${methodLabel(p.method)}${p.payrollPeriod ? ` (${periodLabel(p.payrollPeriod)} payroll)` : ""}${p.note ? ` - ${p.note}` : ""}`, { size: 9 });
  }
  return doc.finish();
}
