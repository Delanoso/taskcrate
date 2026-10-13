import { randomBytes } from "crypto";
import { z } from "zod";
import type { DisciplineEntry } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { appUrl, jsonList, saDateKey } from "@/lib/modules/common";
import { isWarning, offenceByKey, sanctionDoc, sanctionLabel, type Severity } from "@/lib/modules/discipline-options";
import { saveDataUrlUpload } from "@/lib/uploads";

export const SLUG = "discipline-log";
export const FOLDER = "discipline";

export const opt = (max: number) => z.string().trim().max(max).nullable().optional();

export const employeeFields = {
  employeeName: z.string().trim().min(2, "Enter the employee's name").max(120),
  employeeNumber: opt(40),
  employeePhone: opt(40),
  jobTitle: opt(80),
  department: opt(80),
};

export async function getSettings(organizationId: string) {
  return (
    (await db.disciplineSettings.findUnique({ where: { organizationId } })) ??
    (await db.disciplineSettings.create({ data: { organizationId } }))
  );
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

export function validityMonths(settings: Settings, sanction: string) {
  if (sanction === "verbal") return settings.verbalMonths;
  if (sanction === "written") return settings.writtenMonths;
  if (sanction === "final") return settings.finalMonths;
  return 0;
}

export function addMonthsTo(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

/** Same person across cases: employee number when captured, else the normalised name. */
export function employeeKey(e: { employeeNumber?: string | null; employeeName: string }) {
  const num = e.employeeNumber?.trim().toLowerCase();
  return num ? `#${num}` : e.employeeName.trim().toLowerCase().replace(/\s+/g, " ");
}

/** "YYYY-MM-DDTHH:mm" from a datetime-local input, read as South African time. */
export const fromLocalDateTime = (s: string) => new Date(`${s.length === 16 ? `${s}:00` : s}+02:00`);
export const fromDateKey = (s: string) => new Date(`${s}T12:00:00+02:00`);

export async function saveSignature(dataUrl: string, organizationId: string) {
  return saveDataUrlUpload(dataUrl, `${FOLDER}/${organizationId}`);
}

export const newSignToken = () => randomBytes(16).toString("base64url");
export const signUrl = (token: string) => `${appUrl()}/p/discipline/${token}`;

/** A warning counts for progressive discipline until it expires, unless withdrawn or overturned on appeal. */
export function isActiveWarning(c: DisciplineEntry, today = saDateKey()) {
  if (!isWarning(c.stage) || c.status === "withdrawn" || c.status === "open" || c.status === "hearing") return false;
  if (c.appealOutcome === "upheld") return false;
  return !c.validUntil || saDateKey(c.validUntil) >= today;
}

export function serializeCase(c: DisciplineEntry) {
  const photos = jsonList(c.photosJson);
  if (c.photoUrl && !photos.includes(c.photoUrl)) photos.unshift(c.photoUrl);
  const offence = offenceByKey(c.offenceKey);
  return {
    id: c.id,
    reference: c.reference ?? `DC-${c.id.slice(-5).toUpperCase()}`,
    employeeKey: employeeKey(c),
    employeeName: c.employeeName,
    employeeNumber: c.employeeNumber,
    employeePhone: c.employeePhone,
    jobTitle: c.jobTitle,
    department: c.department,
    status: c.status,
    sanction: c.stage,
    sanctionLabel: sanctionLabel(c.stage),
    documentTitle: sanctionDoc(c.stage),
    offenceKey: c.offenceKey,
    offenceLabel: offence?.label ?? (c.offence ? "Other" : "Not recorded"),
    offence: c.offence,
    offenceSeverity: (c.offenceSeverity ?? offence?.severity ?? null) as Severity | null,
    description: c.notes,
    location: c.location,
    witnesses: c.witnesses,
    photos,
    incidentAt: c.incidentAt.toISOString(),
    hearingAt: c.hearingAt?.toISOString() ?? null,
    hearingVenue: c.hearingVenue,
    chairperson: c.chairperson,
    noticeIssuedAt: c.noticeIssuedAt?.toISOString() ?? null,
    noticeAckAt: c.noticeAckAt?.toISOString() ?? null,
    finding: c.finding,
    outcomeReasons: c.outcomeReasons,
    mitigating: c.mitigating,
    aggravating: c.aggravating,
    sanctionDate: c.sanctionDate ? saDateKey(c.sanctionDate) : null,
    validUntil: c.validUntil ? saDateKey(c.validUntil) : null,
    activeWarning: isActiveWarning(c),
    issuedBy: c.issuedBy,
    hasIssuerSignature: !!c.issuerSignature,
    employeeSignedAt: c.employeeSignedAt?.toISOString() ?? null,
    employeeComment: c.employeeComment,
    refusedToSign: c.refusedToSign,
    witnessName: c.witnessName,
    signUrl: c.signToken ? signUrl(c.signToken) : null,
    appealLodgedAt: c.appealLodgedAt ? saDateKey(c.appealLodgedAt) : null,
    appealGrounds: c.appealGrounds,
    appealOutcome: c.appealOutcome,
    appealNotes: c.appealNotes,
    appealDecidedAt: c.appealDecidedAt ? saDateKey(c.appealDecidedAt) : null,
    withdrawnReason: c.withdrawnReason,
    createdAt: c.createdAt.toISOString(),
  };
}

export type SerializedCase = ReturnType<typeof serializeCase>;

/** Every file a case owns, for cleanup on delete. */
export function caseFiles(c: DisciplineEntry) {
  return [...jsonList(c.photosJson), c.photoUrl, c.issuerSignature, c.employeeSignature, c.witnessSignature, c.noticeAckSignature].filter(
    (u): u is string => !!u && u.startsWith("/uploads/"),
  );
}
