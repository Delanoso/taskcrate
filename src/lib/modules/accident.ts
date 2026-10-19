import { z } from "zod";
import { db } from "@/lib/db";
import { photoSchema } from "@/lib/modules/common";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { saveDataUrlUpload } from "@/lib/uploads";

export class AccidentError extends Error {}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalPhoto = photoSchema.optional().or(z.literal(""));

const reportSchema = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Add the date"),
  occurredTime: z.string().regex(/^\d{2}:\d{2}$/, "Add the time"),
  location: z.string().trim().min(2, "Add the place").max(200),
  injuredName: z.string().trim().min(2, "Add the injured person's name").max(160),
  employeeNumber: optionalText(40),
  idNumber: optionalText(20),
  jobTitle: optionalText(80),
  activity: z.string().trim().min(2, "Add what the person was doing").max(500),
  description: z.string().trim().min(2, "Add what happened").max(2000),
  injury: z.string().trim().min(2, "Add the injury and the body part").max(500),
  treatment: optionalText(500),
  witnesses: optionalText(500),
  actionTaken: optionalText(1000),
  photoDataUrl: photoSchema,
  extraPhotoDataUrl: optionalPhoto,
  reporterName: z.string().trim().min(2, "Add the name of the person filing this").max(160),
  reporterSignature: photoSchema,
  injuredSignature: optionalPhoto,
  witnessName: optionalText(160),
  witnessSignature: optionalPhoto,
});

function blank(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

export async function accidentSnapshot(organizationId: string) {
  const reports = await db.accidentReport.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
  return { reports };
}

export async function fileAccident(organizationId: string, raw: unknown) {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) throw new AccidentError(parsed.error.issues[0]?.message ?? "Check the report");
  const data = parsed.data;
  if (data.occurredOn > todayIso()) throw new AccidentError("The accident date cannot be in the future");
  if (data.witnessName?.trim() && !data.witnessSignature) throw new AccidentError("The witness needs to sign");
  const folder = `accident/${organizationId}`;
  const [photoUrl, extraPhotoUrl, reporterSignature, injuredSignature, witnessSignature] = await Promise.all([
    saveDataUrlUpload(data.photoDataUrl, folder),
    data.extraPhotoDataUrl ? saveDataUrlUpload(data.extraPhotoDataUrl, folder) : Promise.resolve(null),
    saveDataUrlUpload(data.reporterSignature, folder),
    data.injuredSignature ? saveDataUrlUpload(data.injuredSignature, folder) : Promise.resolve(null),
    data.witnessSignature ? saveDataUrlUpload(data.witnessSignature, folder) : Promise.resolve(null),
  ]);
  const reportNumber = await nextDocumentNumber(organizationId, "ACC");
  return db.accidentReport.create({
    data: {
      organizationId,
      reportNumber,
      occurredAt: `${data.occurredOn}T${data.occurredTime}`,
      location: data.location,
      injuredName: data.injuredName,
      employeeNumber: blank(data.employeeNumber),
      idNumber: blank(data.idNumber),
      jobTitle: blank(data.jobTitle),
      activity: data.activity,
      description: data.description,
      injury: data.injury,
      treatment: blank(data.treatment),
      witnesses: blank(data.witnesses),
      actionTaken: blank(data.actionTaken),
      photoUrl,
      extraPhotoUrl,
      reporterName: data.reporterName,
      reporterSignature,
      injuredSignature,
      witnessName: blank(data.witnessName),
      witnessSignature: blank(data.witnessName) ? witnessSignature : null,
    },
  });
}
