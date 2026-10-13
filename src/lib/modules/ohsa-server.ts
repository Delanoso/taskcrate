import { rm } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

export async function findAudit(id: string, organizationId: string) {
  return db.ohsaAudit.findFirst({ where: { id, organizationId } });
}

export function parsePhotos(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function removeAuditPhoto(url: string, organizationId: string) {
  if (!url.startsWith(`/uploads/ohsa/${organizationId}/`)) return;
  const filePath = path.join(process.cwd(), "public", url);
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) return;
  await rm(filePath, { force: true }).catch(() => undefined);
}
