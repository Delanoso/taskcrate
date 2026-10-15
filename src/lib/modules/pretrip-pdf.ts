import type { Vehicle, VehicleTripLog } from "@/generated/prisma/client";
import { createBrandedDocument, fmtDateTime, nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { formatKm, parseChecks, parsePhotos } from "@/lib/modules/pretrip-shared";

function plain(value: string) {
  return value.replace(/\u202f/g, " ").replace(/\u00a0/g, " ");
}

export async function buildTripPdf(vehicle: Vehicle & { trips: VehicleTripLog[] }) {
  const documentNumber = await nextDocumentNumber(vehicle.organizationId, "TRP");
  const doc = await createBrandedDocument({
    organizationId: vehicle.organizationId,
    title: `Trip log - ${vehicle.regNumber}`,
    documentNumber,
  });
  doc.heading("Vehicle");
  doc.field("Name", vehicle.name);
  doc.field("Registration", vehicle.regNumber);
  doc.field("Make", vehicle.make);

  const trips = [...vehicle.trips].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(-40);
  doc.heading(trips.length ? `Trips (${trips.length})` : "Trips");
  if (!vehicle.trips.length) doc.paragraph("No trips have been signed for this vehicle yet.");
  if (vehicle.trips.length > trips.length) doc.paragraph("This PDF shows the latest 40 trips.");

  for (const trip of trips) {
    doc.heading(`${trip.driverName} - ${fmtDateTime(trip.createdAt)}`);
    doc.field("Started", fmtDateTime(trip.createdAt));
    if (trip.endedAt) doc.field("Ended", fmtDateTime(trip.endedAt));
    doc.field("Licence", trip.licenceNo);
    doc.field("Where", trip.site);
    doc.field("Start", plain(formatKm(trip.startKm)));
    doc.field("End", trip.endKm == null ? "Still open" : plain(formatKm(trip.endKm)));
    if (trip.varianceFlag) doc.paragraph("Kilometre gap against the previous trip. A job card was opened.");
    const checks = parseChecks(trip.checklistJson);
    if (checks.length) {
      doc.paragraph(checks.map((check) => `${check.pass ? "Pass" : "Fail"} - ${check.label}`).join("; "));
    }
    if (trip.faultNote) doc.field("Fault", trip.faultNote);
    const photos = parsePhotos(trip.photoUrlsJson).map((photo) => photo.url);
    if (photos.length) await doc.imageRow(photos.slice(0, 4), 100);
    await doc.signatures([
      trip.driverSignature
        ? { label: "Driver at start", name: trip.driverName, date: trip.createdAt, url: trip.driverSignature }
        : { label: "Driver at start", note: "Not signed" },
      trip.endSignature
        ? { label: "Driver at the end", name: trip.endDriverName, date: trip.endedAt, url: trip.endSignature }
        : { label: "Driver at the end", note: trip.endedAt ? "Not signed" : "Trip still open" },
    ]);
    if (trip.handoverAt) {
      doc.field("Handover km", trip.handoverKm == null ? null : plain(formatKm(trip.handoverKm)));
      doc.field("Handover note", trip.handoverNote);
      await doc.signatures([
        { label: "Handed over by", name: trip.handoverFrom, date: trip.handoverAt, url: trip.handoverFromSignature },
        { label: "Taken by", name: trip.handoverTo, date: trip.handoverAt, url: trip.handoverToSignature },
      ]);
    }
  }
  return { bytes: await doc.finish(), documentNumber };
}
