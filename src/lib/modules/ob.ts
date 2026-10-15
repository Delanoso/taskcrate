import type { ObEntry, ObSite } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";
import { categoryByLabel, isHandover, type ObEntryView, type ObSiteDetail, type ObSiteSummary } from "@/lib/modules/ob-shared";

export class ObError extends Error {}

type SiteRow = ObSite & { entries?: ObEntry[] };

function clean(value: string | null | undefined, max: number) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function signature(value: string | undefined, message: string) {
  if (!value || !value.startsWith("data:image/") || value.length > 500_000) throw new ObError(message);
  return value;
}

function photo(value: string | undefined, message: string) {
  if (!value || !value.startsWith("data:image/") || value.length > 1_500_000) throw new ObError(message);
  return value;
}

function coord(value: number | undefined, min: number, max: number) {
  if (value == null || Number.isNaN(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

export function wakeDue(lastAt: Date | null, wakeMinutes: number, now = Date.now()) {
  if (!lastAt) return true;
  return now - lastAt.getTime() >= wakeMinutes * 60_000;
}

export function toEntryView(entry: ObEntry, withSignatures: boolean): ObEntryView {
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    category: entry.category,
    notes: entry.notes,
    people: entry.people,
    actionTaken: entry.actionTaken,
    guardName: entry.guardName,
    guardSignature: withSignatures ? entry.guardSignature : null,
    photoUrl: entry.photoUrl,
    extraPhotoUrl: entry.extraPhotoUrl,
    handoverToName: entry.handoverToName,
    handoverToSignature: withSignatures ? entry.handoverToSignature : null,
    lat: entry.lat,
    lng: entry.lng,
    createdAt: entry.createdAt.toISOString(),
    legacy: !entry.guardName && !entry.guardSignature,
  };
}

export function toSiteSummary(site: SiteRow, now = Date.now()): ObSiteSummary {
  const latest = site.entries?.[0] ?? null;
  return {
    id: site.id,
    name: site.name,
    location: site.location,
    publicToken: site.publicToken,
    wakeMinutes: site.wakeMinutes,
    guardPhone: site.guardPhone,
    controlPhone: site.controlPhone,
    lastCategory: latest?.category ?? null,
    lastAt: latest?.createdAt.toISOString() ?? null,
    wakeDue: wakeDue(latest?.createdAt ?? null, site.wakeMinutes, now),
  };
}

export function toSiteDetail(site: SiteRow & { entries: ObEntry[] }, withSignatures: boolean): ObSiteDetail {
  return {
    ...toSiteSummary(site),
    entries: site.entries.map((entry) => toEntryView(entry, withSignatures)),
  };
}

export async function logObEntry(input: {
  site: ObSite;
  category: string;
  notes?: string | null;
  people?: string | null;
  actionTaken?: string | null;
  guardName: string;
  guardSignature?: string;
  photo?: string;
  extraPhoto?: string;
  handoverToName?: string | null;
  handoverToSignature?: string;
  lat?: number;
  lng?: number;
}) {
  const category = categoryByLabel(input.category.trim());
  if (!category) throw new ObError("Choose a category from the list.");
  const notes = clean(input.notes, 4000);
  if (!notes) throw new ObError("Write what happened.");
  const guardName = clean(input.guardName, 120);
  if (!guardName) throw new ObError("Add the guard's name.");
  const guardSignature = signature(input.guardSignature, "The guard must sign the entry.");
  const picture = photo(input.photo, "Add a photo.");
  const extra = input.extraPhoto ? photo(input.extraPhoto, "The extra photo could not be saved. Try a smaller picture.") : null;
  const people = clean(input.people, 500);
  const actionTaken = clean(input.actionTaken, 2000);

  let handoverToName: string | null = null;
  let handoverSignature: string | null = null;
  if (isHandover(category.label)) {
    handoverToName = clean(input.handoverToName, 120);
    if (!handoverToName) throw new ObError("Add the name of the guard taking over.");
    handoverSignature = signature(input.handoverToSignature, "The guard taking over must sign.");
  }

  const lat = coord(input.lat, -90, 90);
  const lng = coord(input.lng, -180, 180);
  const [guardSignatureUrl, photoUrl, extraPhotoUrl, handoverToSignature] = await Promise.all([
    saveDataUrlUpload(guardSignature, `ob/${input.site.organizationId}`),
    saveDataUrlUpload(picture, `ob/${input.site.organizationId}`),
    extra ? saveDataUrlUpload(extra, `ob/${input.site.organizationId}`) : Promise.resolve(null),
    handoverSignature ? saveDataUrlUpload(handoverSignature, `ob/${input.site.organizationId}`) : Promise.resolve(null),
  ]);

  const existing = await db.obEntry.count({ where: { site: { organizationId: input.site.organizationId } } });
  return db.obEntry.create({
    data: {
      siteId: input.site.id,
      entryNumber: `OB-${String(existing + 1).padStart(4, "0")}`,
      category: category.label,
      notes,
      people,
      actionTaken,
      guardName,
      guardSignature: guardSignatureUrl,
      photoUrl,
      extraPhotoUrl,
      handoverToName,
      handoverToSignature,
      lat,
      lng,
    },
  });
}
