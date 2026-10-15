import type { MeterReading, MeterSite } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";
import { buildWhatsAppShareLink } from "@/lib/whatsapp";
import { unitForType, type ReadingView, type SiteDetail, type SiteSummary } from "@/lib/modules/meter-shared";

export class MeterError extends Error {}

type SiteRow = MeterSite & { readings?: MeterReading[] };

function clean(value: string | null | undefined, max: number) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function amount(value: number, message: string) {
  if (!Number.isFinite(value) || value < 0 || value > 99_999_999) throw new MeterError(message);
  return round2(value);
}

function signature(value: string | undefined, message: string) {
  if (!value || !value.startsWith("data:image/") || value.length > 500_000) throw new MeterError(message);
  return value;
}

function photo(value: string | undefined, message: string) {
  if (!value || !value.startsWith("data:image/") || value.length > 1_500_000) throw new MeterError(message);
  return value;
}

export function toReadingView(reading: MeterReading, withSignatures: boolean): ReadingView {
  const legacy = !reading.readerName && !reading.readerSignature;
  return {
    id: reading.id,
    reading: reading.reading,
    occupancy: reading.occupancy,
    alerted: reading.alerted,
    readerName: reading.readerName,
    readerSignature: withSignatures ? reading.readerSignature : null,
    photoUrl: reading.photoUrl,
    extraPhotoUrl: reading.extraPhotoUrl,
    note: reading.note,
    previousReading: reading.previousReading,
    usage: reading.usage,
    baseline: reading.baseline,
    varianceNote: reading.varianceNote,
    checkedByName: reading.checkedByName,
    checkedSignature: withSignatures ? reading.checkedSignature : null,
    checkedAt: reading.checkedAt?.toISOString() ?? null,
    checkNote: reading.checkNote,
    checkPhotoUrl: reading.checkPhotoUrl,
    createdAt: reading.createdAt.toISOString(),
    legacy,
  };
}

export function toSiteSummary(site: SiteRow): SiteSummary {
  const latest = site.readings?.[0] ?? null;
  return {
    id: site.id,
    name: site.name,
    meterType: site.meterType,
    meterNumber: site.meterNumber,
    accountNumber: site.accountNumber,
    municipality: site.municipality,
    location: site.location,
    unit: site.unit || unitForType(site.meterType),
    alertThreshold: site.alertThreshold,
    alertPhone: site.alertPhone,
    publicToken: site.publicToken,
    lastReading: latest?.reading ?? null,
    lastUsage: latest?.usage ?? null,
    lastAt: latest?.createdAt.toISOString() ?? null,
    alertOpen: Boolean(latest?.alerted && !latest.checkedAt),
  };
}

export function toSiteDetail(site: SiteRow & { readings: MeterReading[] }, withSignatures: boolean): SiteDetail {
  return {
    ...toSiteSummary(site),
    readings: site.readings.map((reading) => toReadingView(reading, withSignatures)),
  };
}

async function storeImage(dataUrl: string, organizationId: string) {
  return saveDataUrlUpload(dataUrl, `meter/${organizationId}`);
}

export async function logReading(input: {
  site: MeterSite & { readings: MeterReading[]; organization: { slug: string } };
  reading: number;
  occupancy?: number;
  readerName: string;
  readerSignature?: string;
  photo?: string;
  extraPhoto?: string;
  note?: string | null;
}) {
  const readerName = clean(input.readerName, 120);
  if (!readerName) throw new MeterError("Add the name of the person who read the meter.");
  const reading = amount(input.reading, "Enter the number on the meter.");
  const occupancy = input.occupancy ?? 0;
  if (!Number.isInteger(occupancy) || occupancy < 0 || occupancy > 100_000) {
    throw new MeterError("Occupancy must be a whole number.");
  }
  const readerSignature = signature(input.readerSignature, "The person who read the meter must sign.");
  const dialPhoto = photo(input.photo, "Add a photo of the meter.");
  const extra = input.extraPhoto ? photo(input.extraPhoto, "The extra photo could not be saved. Try a smaller picture.") : null;
  const note = clean(input.note, 2000);
  const unit = input.site.unit || unitForType(input.site.meterType);

  const prior = [...input.site.readings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const previous = prior[0] ?? null;
  if (previous && reading + 0.0001 < previous.reading) {
    throw new MeterError(`This reading is below the last recorded ${previous.reading} ${unit}. Check the dial.`);
  }

  const previousReading = previous ? previous.reading : null;
  const usage = previousReading == null ? null : round2(reading - previousReading);
  let baseline: number | null = null;
  let alerted = false;
  let varianceNote = "First reading on this meter.";

  if (previous && usage != null && prior.length < 2) {
    varianceNote = `Usage ${usage} ${unit}. The next reading can be compared with a baseline.`;
  } else if (previous && usage != null) {
    const recent = prior.slice(0, 4);
    const deltas: number[] = [];
    for (let i = 0; i < recent.length - 1; i++) {
      deltas.push(Math.abs(recent[i].reading - recent[i + 1].reading));
    }
    baseline = round2(deltas.reduce((sum, item) => sum + item, 0) / Math.max(deltas.length, 1));
    const occupancyUp = occupancy > (previous.occupancy ?? 0);
    const over = usage > baseline * input.site.alertThreshold && (baseline > 0 || usage > 0);
    if (over && !occupancyUp) {
      alerted = true;
      varianceNote = `Usage ${usage} ${unit} is above ${input.site.alertThreshold}× the recent baseline of ${baseline} ${unit}. Occupancy did not rise. Flagged for a check.`;
    } else if (over && occupancyUp) {
      varianceNote = `Usage ${usage} ${unit} is above the baseline of ${baseline} ${unit}. Occupancy rose, so this was not flagged.`;
    } else {
      varianceNote = `Usage ${usage} ${unit}. Recent baseline about ${baseline} ${unit}. Within the limit.`;
    }
  }

  const [readerSignatureUrl, photoUrl, extraPhotoUrl] = await Promise.all([
    storeImage(readerSignature, input.site.organizationId),
    storeImage(dialPhoto, input.site.organizationId),
    extra ? storeImage(extra, input.site.organizationId) : Promise.resolve(null),
  ]);

  const saved = await db.meterReading.create({
    data: {
      siteId: input.site.id,
      reading,
      occupancy,
      alerted,
      readerName,
      readerSignature: readerSignatureUrl,
      photoUrl,
      extraPhotoUrl,
      note,
      previousReading,
      usage,
      baseline,
      varianceNote,
    },
  });

  let whatsAppUrl: string | undefined;
  if (alerted) {
    const share = buildWhatsAppShareLink({
      organizationSlug: input.site.organization.slug,
      documentType: "meter-alert",
      documentId: input.site.id,
    });
    const msg = `ALERT: ${input.site.name} (${input.site.meterType}) usage spike. Reading ${reading} ${unit}. ${varianceNote}`;
    const phone = (input.site.alertPhone ?? "").replace(/\D/g, "");
    whatsAppUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : share.whatsAppUrl;
    await db.notification.create({
      data: {
        organizationId: input.site.organizationId,
        productSlug: "meter-variance",
        title: "Meter variance",
        body: msg,
      },
    });
  }

  return { reading: saved, whatsAppUrl };
}

export async function checkReading(input: {
  reading: MeterReading;
  organizationId: string;
  checkedByName: string;
  checkedSignature?: string;
  checkNote?: string | null;
  checkPhoto?: string;
}) {
  if (!input.reading.alerted) throw new MeterError("Only a flagged reading needs a check.");
  if (input.reading.checkedAt) throw new MeterError("This reading has already been checked.");
  const checkedByName = clean(input.checkedByName, 120);
  if (!checkedByName) throw new MeterError("Add the name of the person who checked the meter.");
  const checkNote = clean(input.checkNote, 2000);
  if (!checkNote) throw new MeterError("Write what you found.");
  const signed = signature(input.checkedSignature, "The person who checked the meter must sign.");
  const checkPhoto = input.checkPhoto ? photo(input.checkPhoto, "The check photo could not be saved. Try a smaller picture.") : null;

  const [checkedSignature, checkPhotoUrl] = await Promise.all([
    storeImage(signed, input.organizationId),
    checkPhoto ? storeImage(checkPhoto, input.organizationId) : Promise.resolve(null),
  ]);

  return db.meterReading.update({
    where: { id: input.reading.id },
    data: {
      checkedByName,
      checkedSignature,
      checkedAt: new Date(),
      checkNote,
      checkPhotoUrl,
    },
  });
}
