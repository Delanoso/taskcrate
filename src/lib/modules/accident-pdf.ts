import { db } from "@/lib/db";
import { AccidentError } from "@/lib/modules/accident";
import { companyName } from "@/lib/modules/common";
import { createBrandedDocument } from "@/lib/modules/pdf-kit";

function pretty(occurredAt: string) {
  const [date, time] = occurredAt.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-ZA", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${label} at ${time}`;
}

export async function buildAccidentPdf(organizationId: string, id: string) {
  const report = await db.accidentReport.findFirst({ where: { id, organizationId } });
  if (!report) throw new AccidentError("Report not found");
  const doc = await createBrandedDocument({
    organizationId,
    title: "Accident and injury report",
    documentNumber: report.reportNumber,
  });
  doc.heading("When and where");
  doc.field("Report", report.reportNumber);
  doc.field("Occurred", pretty(report.occurredAt));
  doc.field("Place", report.location);
  doc.field("Filed", report.createdAt.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }));

  doc.heading("Injured person");
  doc.field("Name", report.injuredName);
  doc.field("Employee number", report.employeeNumber);
  doc.field("ID number", report.idNumber);
  doc.field("Job", report.jobTitle);

  doc.heading("What happened");
  doc.field("Doing at the time", report.activity);
  doc.field("What happened", report.description);
  doc.field("Injury and body part", report.injury);
  doc.field("Treatment", report.treatment);
  doc.field("Other witnesses", report.witnesses);
  doc.field("Action taken", report.actionTaken);

  if (report.investigatorName || report.findings) {
    doc.heading("Investigation");
    doc.field("Status", report.status);
    doc.field("Investigator", report.investigatorName);
    doc.field("Findings", report.findings);
    doc.field("Root cause", report.rootCause);
    doc.field("Corrective action", report.correctiveAction);
    if (report.lostTimeDays != null) doc.field("Days off work", String(report.lostTimeDays));
    if (report.costCents) doc.field("Cost", `R ${(report.costCents / 100).toFixed(2)}`);
    if (report.coidaReference) doc.field("Compensation Fund reference", report.coidaReference);
  }

  const photos = [report.photoUrl, report.extraPhotoUrl].filter((url): url is string => !!url);
  if (photos.length) {
    doc.heading("Photos");
    await doc.imageRow(photos, 160);
  }

  doc.heading("Signatures");
  await doc.signatures([
    { label: "Filed by", name: report.reporterName, date: report.createdAt, url: report.reporterSignature },
    report.injuredSignature
      ? { label: "Injured person", name: report.injuredName, date: report.createdAt, url: report.injuredSignature }
      : { label: "Injured person", note: "Not signed" },
    report.witnessName
      ? { label: "Witness", name: report.witnessName, date: report.createdAt, url: report.witnessSignature }
      : { label: "Witness", note: "None named" },
  ]);
  return { bytes: await doc.finish(), fileName: `${report.reportNumber} ${report.injuredName}` };
}

/** Facts an employer needs for the Compensation Fund. This is not the official W.Cl.2 form. */
export async function buildCoidaPack(organizationId: string, id: string) {
  const report = await db.accidentReport.findFirst({ where: { id, organizationId } });
  if (!report) throw new AccidentError("Report not found");
  const employer = await companyName(organizationId);
  const doc = await createBrandedDocument({
    organizationId,
    title: "COIDA employer pack",
    documentNumber: report.reportNumber,
  });
  doc.paragraph(
    "These are the facts for a workplace injury. Complete the official W.Cl.2 on the Department of Employment and Labour form and send it to the Compensation Fund. TaskCrate does not submit it.",
  );
  doc.heading("Employer and employee");
  doc.field("Employer", employer);
  doc.field("Employee", report.injuredName);
  doc.field("ID number", report.idNumber);
  doc.field("Employee number", report.employeeNumber);
  doc.field("Occupation", report.jobTitle);
  doc.heading("The accident");
  doc.field("Date and time", pretty(report.occurredAt));
  doc.field("Place", report.location);
  doc.field("What the employee was doing", report.activity);
  doc.field("What happened", report.description);
  doc.field("Injury and body part", report.injury);
  doc.field("Treatment", report.treatment);
  doc.field("Witnesses", report.witnesses || report.witnessName);
  doc.field("Action taken at the time", report.actionTaken);
  if (report.lostTimeDays != null) doc.field("Days off work", String(report.lostTimeDays));
  if (report.coidaReference) doc.field("Fund reference, once you have it", report.coidaReference);
  doc.heading("Investigation");
  doc.field("Investigator", report.investigatorName);
  doc.field("Findings", report.findings);
  doc.field("Root cause", report.rootCause);
  doc.field("Corrective action", report.correctiveAction);
  const photos = [report.photoUrl, report.extraPhotoUrl].filter((url): url is string => !!url);
  if (photos.length) {
    doc.heading("Photos");
    await doc.imageRow(photos, 160);
  }
  return { bytes: await doc.finish(), fileName: `${report.reportNumber} COIDA pack` };
}
