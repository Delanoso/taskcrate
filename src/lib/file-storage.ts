import { randomBytes } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { sniffType } from "@/lib/safety-file-storage";

export { documentResponse, sniffType } from "@/lib/safety-file-storage";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** Saves an uploaded PDF / photo / Office file under /uploads/<module>/<organizationId>/. */
export async function saveDocument(file: File, module: string, organizationId: string, maxBytes = 15 * 1024 * 1024) {
  if (file.size > maxBytes) throw new Error(`${file.name} is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffType(bytes, file.name);
  if (!kind) throw new Error(`${file.name}: upload a PDF or a photo (JPG/PNG).`);
  const folder = `${module}/${organizationId}`;
  await mkdir(path.join(UPLOAD_ROOT, folder), { recursive: true });
  const stored = `${Date.now()}-${randomBytes(6).toString("hex")}.${kind.ext}`;
  await writeFile(path.join(UPLOAD_ROOT, folder, stored), bytes);
  const base = path.basename(file.name, path.extname(file.name)).replace(/[^\w.\- ()]+/g, "_").slice(0, 100) || "document";
  return { fileUrl: `/uploads/${folder}/${stored}`, fileName: `${base}.${kind.ext}`, mimeType: kind.type, sizeBytes: bytes.length };
}

function resolve(fileUrl: string, module: string) {
  const filePath = path.join(process.cwd(), "public", fileUrl);
  if (!fileUrl.startsWith(`/uploads/${module}/`) || !filePath.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Invalid document path");
  return filePath;
}

export async function readDocument(doc: { fileUrl: string; fileName?: string | null; mimeType?: string | null }, module: string) {
  const bytes = await readFile(resolve(doc.fileUrl, module));
  const sniffed = sniffType(bytes, doc.fileName ?? doc.fileUrl);
  const type = doc.mimeType ?? sniffed?.type ?? "application/octet-stream";
  const ext = sniffed?.ext ?? (path.extname(doc.fileUrl).slice(1) || "bin");
  return { bytes, type, fileName: doc.fileName ?? `document.${ext}` };
}

export async function removeDocument(fileUrl: string, module: string) {
  try {
    await rm(resolve(fileUrl, module), { force: true });
  } catch {
    // An orphaned file is harmless.
  }
}
