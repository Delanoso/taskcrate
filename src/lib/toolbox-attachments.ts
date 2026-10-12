import { randomBytes } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

export const TALK_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const KINDS = [
  { type: "application/pdf", ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  { type: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
] as const;

/** Validates by file signature (not the browser-supplied type) and stores under the tenant folder. */
export async function saveTalkAttachment(file: File, organizationId: string) {
  if (file.size > TALK_ATTACHMENT_MAX_BYTES) {
    throw new Error("File is too large (max 15 MB).");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = KINDS.find((k) => k.magic.every((b, i) => bytes[i] === b));
  if (!kind) throw new Error("Upload a PDF, JPG or PNG file.");

  const folder = `toolbox/${organizationId}`;
  const dir = path.join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}.${kind.ext}`;
  await writeFile(path.join(dir, fileName), bytes);

  const original = (file.name || `attachment.${kind.ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  return { url: `/uploads/${folder}/${fileName}`, name: original, type: kind.type };
}

function attachmentPath(url: string) {
  const filePath = path.join(process.cwd(), "public", url);
  if (!url.startsWith("/uploads/toolbox/") || !filePath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Invalid attachment path");
  }
  return filePath;
}

export async function readTalkAttachment(url: string) {
  return readFile(attachmentPath(url));
}

export async function removeTalkAttachment(url: string) {
  try {
    await rm(attachmentPath(url), { force: true });
  } catch {
    // Row is already gone; an orphaned file is harmless.
  }
}
