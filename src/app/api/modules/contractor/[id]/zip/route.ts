import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { parseRequirements, resolveItem } from "@/lib/modules/safety-file-items";
import { readSafetyFileDocument } from "@/lib/safety-file-storage";
import { buildZip } from "@/lib/zip";

const clean = (s: string) => s.replace(/[\\/:*?"<>|\r\n]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);

/** Whole safety file as a ZIP: one folder per requirement, numbered in requirement order. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("contractor-safety-file");
  if ("error" in gate) return gate.error;
  const profile = await db.contractorProfile.findFirst({
    where: { id: (await params).id, organizationId: gate.session.organizationId },
    include: { documents: { orderBy: { uploadedAt: "asc" } } },
  });
  if (!profile) return new NextResponse("Not found", { status: 404 });

  const order = parseRequirements(profile.requirementsJson);
  const folderFor = (key: string) => {
    const i = order.indexOf(key);
    const label = clean(resolveItem(key).label);
    return i >= 0 ? `${String(i + 1).padStart(2, "0")} ${label}` : `Other - ${label}`;
  };

  const used = new Set<string>();
  const files = [];
  for (const doc of profile.documents) {
    try {
      const file = await readSafetyFileDocument(doc);
      let name = `${folderFor(doc.docType)}/${clean(file.fileName)}`;
      for (let n = 2; used.has(name); n++) name = name.replace(/(\.\w+)?$/, ` (${n})$1`);
      used.add(name);
      files.push({ name, data: file.bytes, date: doc.uploadedAt });
    } catch {
      // Skip files missing on disk rather than failing the whole export.
    }
  }
  if (files.length === 0) return new NextResponse("No documents uploaded yet", { status: 404 });

  const zip = buildZip(files);
  const zipName = `${clean(profile.companyName)} - Safety File.zip`;
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(zipName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
