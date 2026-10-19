import { randomBytes } from "crypto";
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
      status: "filed",
    },
  });
}

const text = (max: number, message: string) => z.string().trim().min(2, message).max(max);

const investigationSchema = z.object({
  id: z.string(),
  investigatorName: text(160, "Add the investigator"),
  findings: text(4000, "Add the findings"),
  rootCause: text(2000, "Add the root cause"),
  correctiveAction: text(2000, "Add the corrective action"),
  lostTimeDays: z.number().min(0).max(3650).optional(),
  cost: z.number().min(0).max(100_000_000).optional(),
  coidaReference: optionalText(80),
});

async function loadReport(organizationId: string, id: string) {
  const report = await db.accidentReport.findFirst({ where: { id, organizationId } });
  if (!report) throw new AccidentError("Report not found");
  return report;
}

function occurredDate(occurredAt: string) {
  const stamp = occurredAt.length === 16 ? `${occurredAt}:00+02:00` : occurredAt;
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function saveInvestigation(organizationId: string, raw: unknown, close: boolean) {
  const parsed = investigationSchema.safeParse(raw);
  if (!parsed.success) throw new AccidentError(parsed.error.issues[0]?.message ?? "Check the investigation");
  const data = parsed.data;
  const report = await loadReport(organizationId, data.id);
  if (report.status === "closed" && !close) throw new AccidentError("This investigation is already closed");
  return db.accidentReport.update({
    where: { id: report.id },
    data: {
      investigatorName: data.investigatorName,
      findings: data.findings,
      rootCause: data.rootCause,
      correctiveAction: data.correctiveAction,
      lostTimeDays: data.lostTimeDays ?? null,
      costCents: Math.round((data.cost ?? 0) * 100),
      coidaReference: blank(data.coidaReference),
      status: close ? "closed" : "investigating",
      closedAt: close ? report.closedAt ?? new Date() : report.closedAt,
    },
  });
}

export async function linkAccident(organizationId: string, raw: unknown) {
  const parsed = z.object({ id: z.string(), link: z.enum(["nearmiss", "discipline", "aod"]) }).safeParse(raw);
  if (!parsed.success) throw new AccidentError("Choose what to open");
  const report = await loadReport(organizationId, parsed.data.id);
  if (parsed.data.link === "nearmiss") {
    if (report.nearMissId) return { kind: "nearmiss" as const, id: report.nearMissId };
    const created = await db.nearMissReport.create({
      data: {
        organizationId,
        reference: await nextDocumentNumber(organizationId, "NM"),
        trackingToken: randomBytes(16).toString("base64url"),
        reportType: "incident",
        description: `Opened from accident ${report.reportNumber}. ${report.description}`.slice(0, 4000),
        immediateAction: report.actionTaken,
        locationHint: report.location,
        occurredAt: occurredDate(report.occurredAt),
        reporterName: report.reporterName,
        photosJson: JSON.stringify([report.photoUrl, report.extraPhotoUrl].filter(Boolean)),
        status: "open",
      },
    });
    await db.accidentReport.update({ where: { id: report.id }, data: { nearMissId: created.id } });
    await db.notification.create({
      data: {
        organizationId,
        productSlug: "near-miss-whisperer",
        title: `Near-miss opened from ${report.reportNumber}`,
        body: created.reference ?? report.injuredName,
      },
    });
    return { kind: "nearmiss" as const, id: created.id, reference: created.reference };
  }
  if (parsed.data.link === "discipline") {
    if (report.disciplineId) return { kind: "discipline" as const, id: report.disciplineId };
    const created = await db.disciplineEntry.create({
      data: {
        organizationId,
        reference: await nextDocumentNumber(organizationId, "DC"),
        employeeName: report.injuredName,
        employeeNumber: report.employeeNumber,
        jobTitle: report.jobTitle,
        stage: "pending",
        status: "open",
        offenceKey: "negligence",
        offence: `Follow-up from accident ${report.reportNumber}.`.slice(0, 1000),
        offenceSeverity: "serious",
        notes: report.description,
        incidentAt: occurredDate(report.occurredAt),
        location: report.location,
        witnesses: report.witnesses,
        photosJson: JSON.stringify([report.photoUrl, report.extraPhotoUrl].filter(Boolean)),
      },
    });
    await db.accidentReport.update({ where: { id: report.id }, data: { disciplineId: created.id } });
    await db.notification.create({
      data: {
        organizationId,
        productSlug: "discipline-log",
        title: `Discipline case opened from ${report.reportNumber}`,
        body: `${created.reference} for ${report.injuredName}. The hearing still has to be run in Discipline.`,
      },
    });
    return { kind: "discipline" as const, id: created.id, reference: created.reference };
  }
  if (report.aodId) return { kind: "aod" as const, id: report.aodId };
  if (report.costCents <= 0) throw new AccidentError("Add the cost on the investigation first. Nothing is deducted until the employee signs the AOD.");
  const created = await db.loanDeductibleRecord.create({
    data: {
      organizationId,
      reference: await nextDocumentNumber(organizationId, "AOD"),
      employeeName: report.injuredName,
      employeeNumber: report.employeeNumber,
      recordType: "deductible",
      reason: "damage",
      amount: report.costCents / 100,
      description: `Accident ${report.reportNumber}: ${report.injury}`.slice(0, 1000),
      incidentDate: occurredDate(report.occurredAt),
      photoUrl: report.photoUrl,
      sourceRef: `Accident ${report.reportNumber}`,
      issuedBy: report.investigatorName || report.reporterName,
      status: "pending",
    },
  });
  await db.accidentReport.update({ where: { id: report.id }, data: { aodId: created.id } });
  await db.notification.create({
    data: {
      organizationId,
      productSlug: "loan-deductible-ledger",
      title: `AOD raised from ${report.reportNumber}`,
      body: `R ${(report.costCents / 100).toFixed(2)} for ${report.injuredName}. Set the repayment plan and send it to be signed before anything is deducted.`,
    },
  });
  return { kind: "aod" as const, id: created.id, reference: created.reference };
}
