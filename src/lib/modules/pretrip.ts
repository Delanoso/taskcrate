import type { Vehicle, VehicleTripLog } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { alertCompany } from "@/lib/email";
import { saveDataUrlUpload } from "@/lib/uploads";
import { PANEL_SIDES, PRETRIP_CHECKS, paperState, parseChecks, parsePhotos, tripIsOpen, type TripPhoto, type TripView } from "@/lib/modules/pretrip-shared";

export class PretripError extends Error {}

type PhotoIn = { side: string; dataUrl: string };

function clean(value: string | null | undefined, max: number) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function signature(value: string | undefined, message: string) {
  if (!value || !value.startsWith("data:image/") || value.length > 500_000) throw new PretripError(message);
  return value;
}

function km(value: number | undefined, message: string) {
  if (value == null || !Number.isInteger(value) || value < 0 || value > 9_999_999) throw new PretripError(message);
  return value;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHOTO = /^data:image\/(jpeg|png);base64,/;

export type VehiclePapers = {
  licenceDiscNo: string | null;
  licenceDiscExpires: string | null;
  licenceDiscPhotoUrl: string | null;
  insurer: string | null;
  insurancePolicyNo: string | null;
  insuranceExpires: string | null;
  insurancePhotoUrl: string | null;
  roadworthyNo: string | null;
  roadworthyExpires: string | null;
  roadworthyPhotoUrl: string | null;
};

export function vehiclePapers(vehicle: Vehicle): VehiclePapers {
  return {
    licenceDiscNo: vehicle.licenceDiscNo,
    licenceDiscExpires: vehicle.licenceDiscExpires,
    licenceDiscPhotoUrl: vehicle.licenceDiscPhotoUrl,
    insurer: vehicle.insurer,
    insurancePolicyNo: vehicle.insurancePolicyNo,
    insuranceExpires: vehicle.insuranceExpires,
    insurancePhotoUrl: vehicle.insurancePhotoUrl,
    roadworthyNo: vehicle.roadworthyNo,
    roadworthyExpires: vehicle.roadworthyExpires,
    roadworthyPhotoUrl: vehicle.roadworthyPhotoUrl,
  };
}

export function publicPapers(vehicle: Vehicle) {
  return [
    { label: "Licence disc", expiresOn: vehicle.licenceDiscExpires, state: paperState(vehicle.licenceDiscExpires) },
    { label: "Insurance", expiresOn: vehicle.insuranceExpires, state: paperState(vehicle.insuranceExpires) },
    { label: "Roadworthy", expiresOn: vehicle.roadworthyExpires, state: paperState(vehicle.roadworthyExpires) },
  ];
}

export async function saveVehiclePapers(vehicle: Vehicle, input: {
  licenceDiscNo?: string;
  licenceDiscExpires?: string;
  licenceDiscPhoto?: string;
  insurer?: string;
  insurancePolicyNo?: string;
  insuranceExpires?: string;
  insurancePhoto?: string;
  roadworthyNo?: string;
  roadworthyExpires?: string;
  roadworthyPhoto?: string;
}) {
  for (const [label, value] of [
    ["licence disc", input.licenceDiscExpires],
    ["insurance", input.insuranceExpires],
    ["roadworthy", input.roadworthyExpires],
  ] as const) {
    if (value && !DATE.test(value)) throw new PretripError(`The ${label} expiry must be a date.`);
  }
  for (const photo of [input.licenceDiscPhoto, input.insurancePhoto, input.roadworthyPhoto]) {
    if (photo && (!PHOTO.test(photo) || photo.length > 1_500_000)) {
      throw new PretripError("One of the certificate photos could not be saved. Try a smaller picture.");
    }
  }
  const folder = `vehicle/${vehicle.organizationId}`;
  const [licenceDiscPhotoUrl, insurancePhotoUrl, roadworthyPhotoUrl] = await Promise.all([
    input.licenceDiscPhoto ? saveDataUrlUpload(input.licenceDiscPhoto, folder) : Promise.resolve(undefined),
    input.insurancePhoto ? saveDataUrlUpload(input.insurancePhoto, folder) : Promise.resolve(undefined),
    input.roadworthyPhoto ? saveDataUrlUpload(input.roadworthyPhoto, folder) : Promise.resolve(undefined),
  ]);
  return db.vehicle.update({
    where: { id: vehicle.id },
    data: {
      licenceDiscNo: clean(input.licenceDiscNo, 40),
      licenceDiscExpires: clean(input.licenceDiscExpires, 10),
      insurer: clean(input.insurer, 120),
      insurancePolicyNo: clean(input.insurancePolicyNo, 40),
      insuranceExpires: clean(input.insuranceExpires, 10),
      roadworthyNo: clean(input.roadworthyNo, 40),
      roadworthyExpires: clean(input.roadworthyExpires, 10),
      ...(licenceDiscPhotoUrl ? { licenceDiscPhotoUrl } : {}),
      ...(insurancePhotoUrl ? { insurancePhotoUrl } : {}),
      ...(roadworthyPhotoUrl ? { roadworthyPhotoUrl } : {}),
    },
  });
}

export function toTripView(trip: VehicleTripLog, withSignatures: boolean): TripView {
  const endedAt = trip.endedAt?.toISOString() ?? null;
  return {
    id: trip.id,
    driverName: trip.driverName,
    licenceNo: trip.licenceNo,
    site: trip.site,
    startKm: trip.startKm,
    endKm: trip.endKm,
    endDriverName: trip.endDriverName,
    checks: parseChecks(trip.checklistJson),
    faultNote: trip.faultNote,
    photos: parsePhotos(trip.photoUrlsJson),
    driverSignature: withSignatures ? trip.driverSignature : null,
    endSignature: withSignatures ? trip.endSignature : null,
    endNote: trip.endNote,
    handoverFrom: trip.handoverFrom,
    handoverTo: trip.handoverTo,
    handoverFromSignature: withSignatures ? trip.handoverFromSignature : null,
    handoverToSignature: withSignatures ? trip.handoverToSignature : null,
    handoverKm: trip.handoverKm,
    handoverNote: trip.handoverNote,
    handoverAt: trip.handoverAt?.toISOString() ?? null,
    startedAt: trip.createdAt.toISOString(),
    endedAt,
    open: tripIsOpen(trip),
    varianceFlag: trip.varianceFlag,
  };
}

async function storePhotos(photos: PhotoIn[] | undefined, organizationId: string, required: string[]) {
  const incoming = photos ?? [];
  for (const side of required) {
    const photo = incoming.find((item) => item.side === side);
    if (!photo?.dataUrl.startsWith("data:image/")) {
      const label = PANEL_SIDES.find((panel) => panel.key === side)?.label ?? side;
      throw new PretripError(`Add a photo of the ${label.toLowerCase()}.`);
    }
  }
  for (const photo of incoming) {
    if (!photo.dataUrl.startsWith("data:image/") || photo.dataUrl.length > 1_500_000) {
      throw new PretripError("One of the photos could not be saved. Try a smaller picture.");
    }
  }
  const saved: TripPhoto[] = [];
  for (const photo of incoming.slice(0, 6)) {
    const url = await saveDataUrlUpload(photo.dataUrl, `vehicle/${organizationId}`);
    saved.push({ url, side: photo.side });
  }
  return saved;
}

export async function startPretrip(input: {
  vehicle: Vehicle;
  driverName: string;
  licenceNo?: string | null;
  site?: string | null;
  startKm: number;
  checks: { key: string; pass: boolean }[];
  faultNote?: string | null;
  photos?: PhotoIn[];
  driverSignature?: string;
}) {
  const driverName = clean(input.driverName, 120);
  if (!driverName) throw new PretripError("Add the driver's name.");
  const startKm = km(input.startKm, "Enter the starting kilometres.");
  const driverSignature = signature(input.driverSignature, "The driver must sign the pre-trip.");

  const checks = PRETRIP_CHECKS.map((check) => {
    const answer = input.checks.find((item) => item.key === check.key);
    if (!answer || typeof answer.pass !== "boolean") throw new PretripError(`Answer ${check.label}.`);
    return { key: check.key, label: check.label, pass: answer.pass };
  });
  const failed = checks.filter((check) => !check.pass);
  const faultNote = clean(input.faultNote, 2000);
  if (failed.length && !faultNote) throw new PretripError("Describe the faults that failed the check.");

  const open = await db.vehicleTripLog.findFirst({
    where: { vehicleId: input.vehicle.id, endKm: null, endedAt: null },
  });
  if (open) throw new PretripError("This vehicle is still out. End that trip or hand it over before a new pre-trip.");

  const last = await db.vehicleTripLog.findFirst({
    where: { vehicleId: input.vehicle.id, endKm: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  let varianceFlag = false;
  let varianceText = "";
  if (last?.endKm != null) {
    if (startKm < last.endKm) {
      varianceFlag = true;
      varianceText = `Starting km ${startKm} is below the last recorded ${last.endKm}.`;
    } else if (startKm - last.endKm > 5) {
      varianceFlag = true;
      varianceText = `Starting km ${startKm} is more than 5 km past the last recorded ${last.endKm}.`;
    }
  }

  const photos = await storePhotos(input.photos, input.vehicle.organizationId, PANEL_SIDES.map((side) => side.key));
  const trip = await db.vehicleTripLog.create({
    data: {
      vehicleId: input.vehicle.id,
      driverName,
      licenceNo: clean(input.licenceNo, 40),
      site: clean(input.site, 120),
      startKm,
      checklistJson: JSON.stringify(checks),
      faultNote,
      photoUrlsJson: JSON.stringify(photos),
      driverSignature,
      varianceFlag,
    },
  });

  if (varianceFlag || failed.length) {
    const lines = [
      `Pre-trip for ${input.vehicle.regNumber}.`,
      `Driver: ${driverName}.`,
      `Starting km: ${startKm}.`,
      failed.length ? `Failed: ${failed.map((check) => check.label).join(", ")}.` : "",
      faultNote ? `Note: ${faultNote}` : "",
      varianceText,
    ].filter(Boolean);
    await alertCompany(input.vehicle.organizationId, {
      productSlug: "pretrip-handover",
      title: "Fleet variance / fault flag",
      body: `${input.vehicle.regNumber}: ${driverName}, km ${startKm}`,
      kind: "pretrip_fault",
      subject: `Vehicle fault: ${input.vehicle.regNumber}`,
      lines,
    });
    await db.jobCard.create({
      data: {
        organizationId: input.vehicle.organizationId,
        mode: "internal",
        title: `Vehicle check — ${input.vehicle.regNumber}`,
        machineRef: input.vehicle.regNumber,
        description: lines.join(" "),
        reportedByName: driverName,
        status: "open",
      },
    });
  }

  return trip;
}

export async function handOverTrip(input: {
  vehicle: Vehicle;
  fromName: string;
  fromSignature?: string;
  toName: string;
  toSignature?: string;
  handoverKm: number;
  note?: string | null;
  photos?: PhotoIn[];
}) {
  const trip = await db.vehicleTripLog.findFirst({
    where: { vehicleId: input.vehicle.id, endKm: null, endedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!trip) throw new PretripError("There is no open trip to hand over.");
  const fromName = clean(input.fromName, 120);
  const toName = clean(input.toName, 120);
  if (!fromName) throw new PretripError("Add the name of the driver handing over.");
  if (!toName) throw new PretripError("Add the name of the driver taking over.");
  const fromSignature = signature(input.fromSignature, "The driver handing over must sign.");
  const toSignature = signature(input.toSignature, "The driver taking over must sign.");
  const handoverKm = km(input.handoverKm, "Enter the kilometres at handover.");
  if (handoverKm < trip.startKm) throw new PretripError(`Handover km cannot be below the start of ${trip.startKm}.`);

  const extra = await storePhotos(input.photos, input.vehicle.organizationId, []);
  const photos = [...parsePhotos(trip.photoUrlsJson), ...extra].slice(0, 8);
  return db.vehicleTripLog.update({
    where: { id: trip.id },
    data: {
      handoverFrom: fromName,
      handoverTo: toName,
      handoverFromSignature: fromSignature,
      handoverToSignature: toSignature,
      handoverKm,
      handoverNote: clean(input.note, 2000),
      handoverAt: new Date(),
      photoUrlsJson: JSON.stringify(photos),
    },
  });
}

export async function closeTrip(input: {
  vehicle: Vehicle;
  endDriverName: string;
  endSignature?: string;
  endKm: number;
  endNote?: string | null;
}) {
  const trip = await db.vehicleTripLog.findFirst({
    where: { vehicleId: input.vehicle.id, endKm: null, endedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!trip) throw new PretripError("There is no open trip to end.");
  const endDriverName = clean(input.endDriverName, 120);
  if (!endDriverName) throw new PretripError("Add the name of the driver ending the trip.");
  const endSignature = signature(input.endSignature, "The driver ending the trip must sign.");
  const endKm = km(input.endKm, "Enter the ending kilometres.");
  const floor = Math.max(trip.startKm, trip.handoverKm ?? trip.startKm);
  if (endKm < floor) throw new PretripError(`Ending km cannot be below ${floor}.`);

  return db.vehicleTripLog.update({
    where: { id: trip.id },
    data: {
      endKm,
      endDriverName,
      endSignature,
      endNote: clean(input.endNote, 2000),
      endedAt: new Date(),
    },
  });
}
