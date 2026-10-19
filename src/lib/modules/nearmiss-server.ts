import { randomBytes } from "crypto";
import { z } from "zod";
import type { NearMissReport } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { alertCompany } from "@/lib/email";
import { appUrl, jsonList, photoSchema, saDateKey } from "@/lib/modules/common";
import { CATEGORIES, MAX_REPORT_PHOTOS, REPORT_TYPE_KEYS, SEVERITY_KEYS, typeLabel } from "@/lib/modules/nearmiss-options";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { saveDataUrlUpload } from "@/lib/uploads";

export const SLUG = "near-miss-whisperer";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

export const reportInput = z.object({
  reportType: z.enum(REPORT_TYPE_KEYS),
  category: z.enum(CATEGORIES).nullable().optional(),
  potentialSeverity: z.enum(SEVERITY_KEYS).nullable().optional(),
  description: z.string().trim().min(5, "Describe what happened (at least 5 characters)").max(4000),
  immediateAction: z.string().trim().max(2000).nullable().optional(),
  locationHint: z.string().trim().max(200).nullable().optional(),
  occurredOn: dateKey.nullable().optional(),
  reporterName: z.string().trim().max(120).nullable().optional(),
  reporterContact: z.string().trim().max(120).nullable().optional(),
  photos: z.array(photoSchema).max(MAX_REPORT_PHOTOS, `Up to ${MAX_REPORT_PHOTOS} photos`).default([]),
});

export async function getBoard(organizationId: string) {
  return (
    (await db.nearMissBoard.findUnique({ where: { organizationId } })) ??
    (await db.nearMissBoard.create({ data: { organizationId } }))
  );
}

export async function createReport(organizationId: string, input: z.infer<typeof reportInput>) {
  const photos: string[] = [];
  for (const p of input.photos) photos.push(await saveDataUrlUpload(p, `nearmiss/${organizationId}`));
  const reference = await nextDocumentNumber(organizationId, "NM");
  const occurredAt = input.occurredOn && input.occurredOn <= saDateKey() ? new Date(`${input.occurredOn}T12:00:00+02:00`) : null;
  const report = await db.nearMissReport.create({
    data: {
      organizationId,
      reference,
      trackingToken: randomBytes(16).toString("base64url"),
      reportType: input.reportType,
      category: input.category ?? null,
      potentialSeverity: input.potentialSeverity ?? null,
      description: input.description,
      immediateAction: input.immediateAction || null,
      locationHint: input.locationHint || null,
      occurredAt,
      reporterName: input.reporterName || null,
      reporterContact: input.reporterContact || null,
      photosJson: JSON.stringify(photos),
    },
  });
  const title = `${typeLabel(input.reportType)} reported (${reference})`;
  await alertCompany(organizationId, {
    productSlug: SLUG,
    title,
    body: input.description.slice(0, 140),
    kind: "nearmiss_filed",
    subject: title,
    lines: [input.description.slice(0, 500), input.locationHint ? `Place: ${input.locationHint}` : "No place was given.", "Rate it and close it in Near-Miss. An overdue action comes back in the morning email."],
  });
  return report;
}

export function trackingUrl(token: string) {
  return `${appUrl()}/p/nearmiss/track/${token}`;
}

export function serializeReport(r: NearMissReport) {
  const photos = jsonList(r.photosJson);
  if (r.photoUrl && !photos.includes(r.photoUrl)) photos.unshift(r.photoUrl);
  const today = saDateKey();
  return {
    id: r.id,
    reference: r.reference ?? `NM-${r.id.slice(-5).toUpperCase()}`,
    reportType: r.reportType,
    category: r.category,
    potentialSeverity: r.potentialSeverity,
    description: r.description,
    immediateAction: r.immediateAction,
    locationHint: r.locationHint,
    occurredAt: r.occurredAt?.toISOString() ?? null,
    reporterName: r.reporterName,
    reporterContact: r.reporterContact,
    photos,
    status: r.status,
    riskRating: r.riskRating,
    assignedTo: r.assignedTo,
    correctiveAction: r.correctiveAction,
    dueDate: r.dueDate ? saDateKey(r.dueDate) : null,
    overdue: r.status !== "closed" && !!r.dueDate && saDateKey(r.dueDate) < today,
    feedback: r.feedback,
    triagedAt: r.triagedAt?.toISOString() ?? null,
    closedAt: r.closedAt?.toISOString() ?? null,
    closedBy: r.closedBy,
    closeOutNote: r.closeOutNote,
    closeOutPhotos: jsonList(r.closeOutPhotosJson),
    trackingUrl: r.trackingToken ? trackingUrl(r.trackingToken) : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export type SerializedReport = ReturnType<typeof serializeReport>;
