import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly } from "@/lib/modules/common";
import { readDocument, removeDocument, saveDocument } from "@/lib/file-storage";
import { FOLDER, SLUG, pdfPageCount, serializeTemplate } from "@/lib/modules/contract-server";

/** multipart: file (PDF), name, category, requireCountersign ("true"), dueDays */
export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "manage templates");
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
  const name = String(form.get("name") ?? "").trim().slice(0, 120) || file.name.replace(/\.pdf$/i, "");
  const category = ["contract", "policy", "other"].includes(String(form.get("category"))) ? String(form.get("category")) : "contract";
  const dueRaw = Number(form.get("dueDays"));
  const dueDays = Number.isInteger(dueRaw) && dueRaw >= 1 && dueRaw <= 90 ? dueRaw : null;

  let saved;
  try {
    saved = await saveDocument(file, FOLDER, gate.session.organizationId, 20 * 1024 * 1024);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
  if (saved.mimeType !== "application/pdf") {
    await removeDocument(saved.fileUrl, FOLDER);
    return NextResponse.json({ error: "Templates must be PDF files. For Word documents, save as PDF first." }, { status: 400 });
  }
  let pages: number;
  try {
    pages = await pdfPageCount((await readDocument(saved, FOLDER)).bytes);
  } catch {
    await removeDocument(saved.fileUrl, FOLDER);
    return NextResponse.json({ error: "This PDF is password-protected or damaged. Remove the password and try again." }, { status: 400 });
  }
  const t = await db.contractTemplate.create({
    data: {
      organizationId: gate.session.organizationId,
      name,
      category,
      kind: "pdf",
      fileUrl: saved.fileUrl,
      fileName: saved.fileName,
      pageCount: pages,
      requireCountersign: form.get("requireCountersign") === "true",
      dueDays,
    },
  });
  return NextResponse.json({ template: serializeTemplate(t) });
}
