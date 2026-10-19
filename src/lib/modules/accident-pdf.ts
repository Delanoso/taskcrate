import { db } from "@/lib/db";
import { AccidentError } from "@/lib/modules/accident";
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
