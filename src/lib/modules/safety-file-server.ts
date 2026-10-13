import { db } from "@/lib/db";
import { evaluateSafetyFile, parseRequirements } from "@/lib/modules/safety-file-items";

type ProfileWithDocs = {
  id: string;
  status: string;
  requirementsJson: string;
  documents: {
    id: string;
    docType: string;
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    expiresAt: Date | null;
    uploadedAt: Date;
  }[];
};

/** Re-evaluates the file and persists the status if it changed (documents expire over time). */
export async function safetyFileView(profile: ProfileWithDocs) {
  const requirements = parseRequirements(profile.requirementsJson);
  const evaluation = evaluateSafetyFile(requirements, profile.documents);
  if (evaluation.status !== profile.status) {
    await db.contractorProfile.update({ where: { id: profile.id }, data: { status: evaluation.status } });
  }
  return {
    requirements,
    status: evaluation.status,
    done: evaluation.done,
    total: evaluation.total,
    items: evaluation.items,
    documents: profile.documents
      .map((d) => ({
        id: d.id,
        docType: d.docType,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        expiresAt: d.expiresAt,
        uploadedAt: d.uploadedAt,
      }))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()),
  };
}

export const documentSelect = {
  id: true,
  docType: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  expiresAt: true,
  uploadedAt: true,
} as const;
