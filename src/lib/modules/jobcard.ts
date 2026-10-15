import type { JobCard } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";
import {
  closeGaps,
  parseParts,
  parsePhotos,
  type JobCardSummary,
  type JobCardView,
  type JobMode,
  type JobPart,
  type JobPhoto,
  type JobPriority,
} from "@/lib/modules/jobcard-shared";

export class JobCardInputError extends Error {}

type OrgName = { name: string; branding: { displayName: string } | null };

export type JobCardRecord = JobCard & { organization?: OrgName };

type PhotoIn = { dataUrl: string; side: "open" | "work" };

export type JobCardPatch = {
  title?: string;
  machineRef?: string | null;
  location?: string | null;
  priority?: JobPriority;
  description?: string | null;
  reportedByName?: string | null;
  reportedByPhone?: string | null;
  openComment?: string | null;
  openSignature?: string;
  mechanicName?: string | null;
  workComment?: string | null;
  technicianSignature?: string;
  hoursWorked?: number | null;
  downtimeHours?: number | null;
  parts?: JobPart[];
  acceptName?: string | null;
  acceptComment?: string | null;
  acceptSignature?: string;
  status?: string;
  newPhotos?: PhotoIn[];
};

const PRIORITIES = new Set<JobPriority>(["low", "normal", "urgent"]);

function clean(value: string | null | undefined, max: number) {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function signature(value: string | undefined) {
  if (!value) return undefined;
  if (!value.startsWith("data:image/") || value.length > 500_000) {
    throw new JobCardInputError("The signature could not be saved. Sign again.");
  }
  return value;
}

function companyName(org?: OrgName) {
  return org?.branding?.displayName ?? org?.name ?? "";
}

export function jobNumberFor(item: { id: string; jobNumber: string | null }) {
  return item.jobNumber ?? `JC-${item.id.slice(-4).toUpperCase()}`;
}

export function toJobCardView(item: JobCardRecord): JobCardView {
  const priority = PRIORITIES.has(item.priority as JobPriority) ? (item.priority as JobPriority) : "normal";
  const mode: JobMode = item.mode === "field" ? "field" : "internal";
  return {
    id: item.id,
    jobNumber: jobNumberFor(item),
    mode,
    title: item.title,
    status: item.status,
    priority,
    machineRef: item.machineRef,
    location: item.location,
    description: item.description,
    reportedByName: item.reportedByName,
    reportedByPhone: item.reportedByPhone,
    openComment: item.openComment,
    openSignature: item.openSignature,
    openSignedAt: item.openSignedAt?.toISOString() ?? null,
    mechanicName: item.mechanicName,
    workComment: item.workComment,
    technicianSignature: item.technicianSignature,
    technicianSignedAt: item.technicianSignedAt?.toISOString() ?? null,
    hoursWorked: item.hoursWorked,
    downtimeHours: item.downtimeHours,
    parts: parseParts(item.partsJson),
    partsCost: item.partsCost,
    acceptName: item.clientName,
    acceptComment: item.acceptComment,
    acceptSignature: item.clientSignature,
    acceptedAt: item.acceptedAt?.toISOString() ?? null,
    photos: parsePhotos(item.photosJson),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    companyName: companyName(item.organization),
    publicToken: item.publicToken,
  };
}

export function toJobCardSummary(item: JobCard): JobCardSummary {
  const priority = PRIORITIES.has(item.priority as JobPriority) ? (item.priority as JobPriority) : "normal";
  return {
    id: item.id,
    jobNumber: jobNumberFor(item),
    mode: item.mode === "field" ? "field" : "internal",
    title: item.title,
    status: item.status,
    priority,
    machineRef: item.machineRef,
    reportedByName: item.reportedByName,
    mechanicName: item.mechanicName,
    createdAt: item.createdAt.toISOString(),
    publicToken: item.publicToken,
  };
}

async function storePhotos(existing: JobCard, incoming: PhotoIn[] | undefined) {
  const photos: JobPhoto[] = parsePhotos(existing.photosJson);
  for (const photo of (incoming ?? []).slice(0, 4)) {
    if (photos.length >= 8) break;
    if (!photo.dataUrl.startsWith("data:image/") || photo.dataUrl.length > 1_500_000) {
      throw new JobCardInputError("One of the photos could not be saved. Try a smaller picture.");
    }
    const url = await saveDataUrlUpload(photo.dataUrl, `jobcard/${existing.organizationId}`);
    photos.push({ url, side: photo.side === "work" ? "work" : "open" });
  }
  return photos;
}

export async function nextJobNumber(organizationId: string) {
  const count = await db.jobCard.count({ where: { organizationId } });
  return `JC-${String(count + 1).padStart(4, "0")}`;
}

export async function applyJobCardPatch(existing: JobCard, patch: JobCardPatch) {
  if (existing.status === "done") {
    throw new JobCardInputError("This job card is already closed.");
  }

  const parts = patch.parts ?? parseParts(existing.partsJson);
  const partsCost = parts.reduce((sum, part) => sum + part.qty * part.cost, 0);
  const now = new Date();

  const openSignature = signature(patch.openSignature) ?? existing.openSignature;
  const technicianSignature = signature(patch.technicianSignature) ?? existing.technicianSignature;
  const acceptSignature = signature(patch.acceptSignature) ?? existing.clientSignature;

  const next = {
    title: patch.title != null ? (clean(patch.title, 160) ?? existing.title) : existing.title,
    machineRef: patch.machineRef !== undefined ? clean(patch.machineRef, 120) ?? null : existing.machineRef,
    location: patch.location !== undefined ? clean(patch.location, 160) ?? null : existing.location,
    priority: patch.priority ?? (PRIORITIES.has(existing.priority as JobPriority) ? existing.priority : "normal"),
    description: patch.description !== undefined ? clean(patch.description, 4000) ?? null : existing.description,
    reportedByName: patch.reportedByName !== undefined ? clean(patch.reportedByName, 120) ?? null : existing.reportedByName,
    reportedByPhone: patch.reportedByPhone !== undefined ? clean(patch.reportedByPhone, 40) ?? null : existing.reportedByPhone,
    openComment: patch.openComment !== undefined ? clean(patch.openComment, 4000) ?? null : existing.openComment,
    openSignature,
    mechanicName: patch.mechanicName !== undefined ? clean(patch.mechanicName, 120) ?? null : existing.mechanicName,
    workComment: patch.workComment !== undefined ? clean(patch.workComment, 4000) ?? null : existing.workComment,
    technicianSignature,
    hoursWorked: patch.hoursWorked !== undefined ? patch.hoursWorked : existing.hoursWorked,
    downtimeHours: patch.downtimeHours !== undefined ? patch.downtimeHours : existing.downtimeHours,
    clientName: patch.acceptName !== undefined ? clean(patch.acceptName, 120) ?? null : existing.clientName,
    acceptComment: patch.acceptComment !== undefined ? clean(patch.acceptComment, 4000) ?? null : existing.acceptComment,
    clientSignature: acceptSignature,
  };

  if (next.hoursWorked != null && (!Number.isFinite(next.hoursWorked) || next.hoursWorked < 0 || next.hoursWorked > 999)) {
    throw new JobCardInputError("Hours need to be a number from 0 upwards.");
  }
  if (next.downtimeHours != null && (!Number.isFinite(next.downtimeHours) || next.downtimeHours < 0 || next.downtimeHours > 9999)) {
    throw new JobCardInputError("Downtime hours need to be a number from 0 upwards.");
  }

  const mode: JobMode = existing.mode === "field" ? "field" : "internal";
  const gaps = closeGaps(
    {
      ...next,
      acceptName: next.clientName,
      acceptSignature: next.clientSignature,
    },
    mode,
  );

  let status = existing.status;
  if (gaps.length === 0) status = "done";
  else if (next.technicianSignature) status = "awaiting_signoff";
  else if (patch.status === "scheduled" || patch.status === "in_progress" || patch.status === "open") status = patch.status;

  if (patch.status === "done" && gaps.length > 0) {
    throw new JobCardInputError(`Still needed before this job card can close: ${gaps.join(", ")}.`);
  }

  const photos = await storePhotos(existing, patch.newPhotos);

  return db.jobCard.update({
    where: { id: existing.id },
    data: {
      ...next,
      photosJson: JSON.stringify(photos),
      partsJson: JSON.stringify(parts),
      partsCost,
      status,
      openSignedAt: openSignature ? existing.openSignedAt ?? now : existing.openSignedAt,
      technicianSignedAt: technicianSignature ? existing.technicianSignedAt ?? now : existing.technicianSignedAt,
      acceptedAt: acceptSignature ? existing.acceptedAt ?? now : existing.acceptedAt,
      startedAt: status === "in_progress" || status === "awaiting_signoff" || status === "done"
        ? existing.startedAt ?? now
        : existing.startedAt,
      completedAt: status === "done" ? existing.completedAt ?? now : existing.completedAt,
    },
    include: { organization: { include: { branding: true } } },
  });
}
