import type { ObEntry, ObSite } from "@/generated/prisma/client";
import { createBrandedDocument, fmtDateTime, nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { formatGps } from "@/lib/modules/ob-shared";

export async function buildObPdf(site: ObSite & { entries: ObEntry[] }) {
  const documentNumber = await nextDocumentNumber(site.organizationId, "OBL");
  const doc = await createBrandedDocument({
    organizationId: site.organizationId,
    title: `Occurrence book - ${site.name}`,
    documentNumber,
  });

  doc.heading("Site");
  doc.field("Name", site.name);
  doc.field("Location", site.location);
  doc.field("Wake-up after", `${site.wakeMinutes} minutes without an entry`);
  doc.field("Guard phone", site.guardPhone);
  doc.field("Control room", site.controlPhone);
  doc.paragraph("Each entry is filed with the server time. Filed entries are not edited.");

  const entries = [...site.entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(-80);
  doc.heading(entries.length ? `Entries (${entries.length})` : "Entries");
  if (!site.entries.length) doc.paragraph("No entries have been filed at this site yet.");
  if (site.entries.length > entries.length) doc.paragraph("This PDF shows the latest 80 entries.");

  for (const entry of entries) {
    doc.heading(`${entry.entryNumber || "Entry"}  -  ${entry.category}`);
    doc.field("Filed", fmtDateTime(entry.createdAt));
    doc.field("Guard", entry.guardName || "Not recorded");
    doc.field("What happened", entry.notes);
    doc.field("People involved", entry.people);
    doc.field("Action taken", entry.actionTaken);
    doc.field("GPS", formatGps(entry.lat, entry.lng) ?? "Not captured");
    const photos = [entry.photoUrl, entry.extraPhotoUrl].filter((url): url is string => Boolean(url));
    if (photos.length) await doc.imageRow(photos, 110);
    await doc.signatures([
      entry.guardSignature
        ? { label: "Filed by", name: entry.guardName, date: entry.createdAt, url: entry.guardSignature }
        : { label: "Filed by", note: "No signature on this entry" },
      ...(entry.handoverToName
        ? [{ label: "Taken over by", name: entry.handoverToName, date: entry.createdAt, url: entry.handoverToSignature }]
        : []),
    ]);
  }

  return { bytes: await doc.finish(), documentNumber };
}
