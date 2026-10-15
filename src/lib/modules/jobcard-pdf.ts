import type { JobCard } from "@/generated/prisma/client";
import { createBrandedDocument, fmtDateTime, nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { parseParts, parsePhotos, sideLabels } from "@/lib/modules/jobcard-shared";

export async function buildJobCardPdf(card: JobCard) {
  const documentNumber = card.jobNumber || (await nextDocumentNumber(card.organizationId, "JC"));
  const labels = sideLabels(card.mode === "field" ? "field" : "internal");
  const doc = await createBrandedDocument({
    organizationId: card.organizationId,
    title: `${labels.kind} job card ${documentNumber}`,
    documentNumber,
  });
  doc.heading("Job");
  doc.field("Number", documentNumber);
  doc.field("Title", card.title);
  doc.field("Status", card.status);
  doc.field("Priority", card.priority);
  doc.field(labels.asset, card.machineRef);
  doc.field(labels.place, card.location);
  doc.field("Opened", fmtDateTime(card.createdAt));
  if (card.startedAt) doc.field("Started", fmtDateTime(card.startedAt));
  if (card.completedAt) doc.field("Closed", fmtDateTime(card.completedAt));

  doc.heading("Opening");
  doc.field("Reported by", card.reportedByName);
  doc.field("Phone", card.reportedByPhone);
  doc.field("Fault", card.description);
  doc.field("Comment", card.openComment);
  const openPhotos = parsePhotos(card.photosJson).filter((photo) => photo.side === "open").map((photo) => photo.url);
  if (openPhotos.length) await doc.imageRow(openPhotos, 110);
  await doc.signatures([
    card.openSignature
      ? { label: "Opened by", name: card.reportedByName, date: card.openSignedAt ?? card.createdAt, url: card.openSignature }
      : { label: "Opened by", note: "Not signed" },
  ]);

  doc.heading("Work");
  doc.field("Technician", card.mechanicName);
  doc.field("Hours", card.hoursWorked == null ? null : String(card.hoursWorked));
  if (card.mode !== "field") doc.field("Downtime hours", card.downtimeHours == null ? null : String(card.downtimeHours));
  doc.field("Comment", card.workComment);
  const parts = parseParts(card.partsJson);
  if (parts.length) {
    doc.paragraph(parts.map((part) => `${part.qty} x ${part.name}${part.cost ? ` (R ${part.cost})` : ""}`).join("; "));
  }
  const workPhotos = parsePhotos(card.photosJson).filter((photo) => photo.side === "work").map((photo) => photo.url);
  if (workPhotos.length) await doc.imageRow(workPhotos, 110);
  await doc.signatures([
    card.technicianSignature
      ? { label: "Technician", name: card.mechanicName, date: card.technicianSignedAt, url: card.technicianSignature }
      : { label: "Technician", note: "Not signed" },
  ]);

  doc.heading("Sign-off");
  doc.field(labels.accept, card.clientName);
  doc.field(labels.acceptComment, card.acceptComment);
  await doc.signatures([
    card.clientSignature
      ? { label: labels.acceptSign, name: card.clientName, date: card.acceptedAt, url: card.clientSignature }
      : { label: labels.acceptSign, note: "Not signed" },
  ]);

  return { bytes: await doc.finish(), documentNumber };
}
