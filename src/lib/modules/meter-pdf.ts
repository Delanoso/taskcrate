import type { MeterReading, MeterSite } from "@/generated/prisma/client";
import { createBrandedDocument, fmtDateTime, nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { formatAmount, meterTypeLabel } from "@/lib/modules/meter-shared";

export async function buildMeterLogPdf(site: MeterSite & { readings: MeterReading[] }) {
  const documentNumber = await nextDocumentNumber(site.organizationId, "MTR");
  const doc = await createBrandedDocument({
    organizationId: site.organizationId,
    title: `Meter log - ${site.name}`,
    documentNumber,
  });
  const unit = site.unit;

  doc.heading("Meter");
  doc.field("Name", site.name);
  doc.field("Type", meterTypeLabel(site.meterType));
  doc.field("Meter number", site.meterNumber);
  doc.field("Municipal account", site.accountNumber);
  doc.field("Municipality", site.municipality);
  doc.field("Location", site.location);
  doc.field("Unit", unit);
  doc.field("Alert when usage exceeds", `${site.alertThreshold} x the recent baseline`);
  doc.field("Alert phone", site.alertPhone);

  const readings = [...site.readings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  doc.heading(readings.length ? `Readings (${readings.length})` : "Readings");
  if (!readings.length) doc.paragraph("No readings have been signed on this meter yet.");

  for (const reading of readings) {
    doc.heading(`${fmtDateTime(reading.createdAt)}${reading.alerted ? "  -  Flagged" : ""}`);
    doc.field("Read by", reading.readerName || "Not recorded");
    doc.field("Reading", formatAmount(reading.reading, unit).replace(/\u202f/g, " ").replace(/\u00a0/g, " "));
    doc.field("Previous", reading.previousReading == null ? "None" : formatAmount(reading.previousReading, unit).replace(/\u202f/g, " ").replace(/\u00a0/g, " "));
    doc.field("Usage", reading.usage == null ? "None" : formatAmount(reading.usage, unit).replace(/\u202f/g, " ").replace(/\u00a0/g, " "));
    doc.field("Occupancy", String(reading.occupancy));
    if (reading.varianceNote) doc.field("Variance", reading.varianceNote);
    if (reading.note) doc.field("Note", reading.note);
    const photos = [reading.photoUrl, reading.extraPhotoUrl].filter((url): url is string => Boolean(url));
    if (photos.length) await doc.imageRow(photos, 110);
    await doc.signatures([
      reading.readerSignature
        ? { label: "Read by", name: reading.readerName, date: reading.createdAt, url: reading.readerSignature }
        : { label: "Read by", note: "No signature on this reading" },
    ]);
    if (reading.checkedAt) {
      doc.field("Check", reading.checkNote);
      if (reading.checkPhotoUrl) await doc.imageRow([reading.checkPhotoUrl], 110);
      await doc.signatures([
        { label: "Checked by", name: reading.checkedByName, date: reading.checkedAt, url: reading.checkedSignature },
      ]);
    } else if (reading.alerted) {
      doc.paragraph("This reading is flagged and has not been checked yet.");
    }
  }

  return { bytes: await doc.finish(), documentNumber };
}
