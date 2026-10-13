import { randomBytes } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

export const SAFETY_FILE_MAX_BYTES = 20 * 1024 * 1024;

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const PDF = [0x25, 0x50, 0x44, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPG = [0xff, 0xd8, 0xff];
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0];

const OFFICE: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
};

const starts = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b);

/** Detects the real type from the file signature; Office formats also need a matching extension. */
export function sniffType(bytes: Uint8Array, fileName = ""): { type: string; ext: string } | null {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  if (starts(bytes, PDF)) return { type: "application/pdf", ext: "pdf" };
  if (starts(bytes, PNG)) return { type: "image/png", ext: "png" };
  if (starts(bytes, JPG)) return { type: "image/jpeg", ext: "jpg" };
  if (starts(bytes, ZIP) && (ext === "docx" || ext === "xlsx")) return { type: OFFICE[ext], ext };
  if (starts(bytes, OLE) && (ext === "doc" || ext === "xls")) return { type: OFFICE[ext], ext };
  return null;
}

export async function saveSafetyFileDocument(file: File, organizationId: string) {
  if (file.size > SAFETY_FILE_MAX_BYTES) throw new Error(`${file.name} is too large (max 20 MB).`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffType(bytes, file.name);
  if (!kind) throw new Error(`${file.name}: upload a PDF, photo (JPG/PNG), Word or Excel file.`);

  const folder = `contractor/${organizationId}`;
  await mkdir(path.join(UPLOAD_ROOT, folder), { recursive: true });
  const stored = `${Date.now()}-${randomBytes(6).toString("hex")}.${kind.ext}`;
  await writeFile(path.join(UPLOAD_ROOT, folder, stored), bytes);

  const base = path.basename(file.name, path.extname(file.name)).replace(/[^\w.\- ()]+/g, "_").slice(0, 100) || "document";
  return {
    fileUrl: `/uploads/${folder}/${stored}`,
    fileName: `${base}.${kind.ext}`,
    mimeType: kind.type,
    sizeBytes: bytes.length,
  };
}

function resolve(fileUrl: string) {
  const filePath = path.join(process.cwd(), "public", fileUrl);
  if (!fileUrl.startsWith("/uploads/contractor/") || !filePath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Invalid document path");
  }
  return filePath;
}

type StoredDoc = { fileUrl: string; fileName: string | null; mimeType: string | null; docType: string };

/** Reads a stored document; older uploads lack metadata, so the type is sniffed from the bytes. */
export async function readSafetyFileDocument(doc: StoredDoc) {
  const bytes = await readFile(resolve(doc.fileUrl));
  const sniffed = sniffType(bytes, doc.fileName ?? doc.fileUrl);
  const type = doc.mimeType ?? sniffed?.type ?? "application/octet-stream";
  const ext = sniffed?.ext ?? (path.extname(doc.fileUrl).slice(1) || "bin");
  const fileName = doc.fileName ?? `${doc.docType}.${ext}`;
  return { bytes, type, fileName };
}

export async function removeSafetyFileDocument(fileUrl: string) {
  try {
    await rm(resolve(fileUrl), { force: true });
  } catch {
    // Row is already gone; an orphaned file is harmless.
  }
}

/** PDFs and images open in the browser; Office files always download. */
export function documentResponse(
  file: { bytes: Buffer; type: string; fileName: string },
  download: boolean,
) {
  const inline = !download && (file.type === "application/pdf" || file.type.startsWith("image/"));
  const safeName = file.fileName.replace(/["\\\r\n]/g, "_");
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
