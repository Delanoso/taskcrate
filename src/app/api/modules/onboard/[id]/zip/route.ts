import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound } from "@/lib/modules/common";
import { readDocument } from "@/lib/file-storage";
import { itemLabel } from "@/lib/modules/onboard-items";
import { buildInfoSheet } from "@/lib/modules/onboard-pdf";
import { FOLDER, SLUG } from "@/lib/modules/onboard-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { buildZip } from "@/lib/zip";

const clean = (s: string) => s.replace(/[^\w .()-]+/g, "_").trim() || "file";

/** Personnel file: information sheet PDF plus every uploaded document, grouped by checklist item. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "download personnel files");
  if (denied) return denied;
  const p = await db.onboardingPacket.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId }, include: { documents: true } });
  if (!p) return notFound();

  const files: { name: string; data: Buffer }[] = [];
  files.push({ name: "Employee information.pdf", data: Buffer.from(await buildInfoSheet(p, await nextDocumentNumber(p.organizationId, "EMP"))) });
  const used = new Set<string>();
  for (const d of p.documents) {
    try {
      const f = await readDocument(d, FOLDER);
      let name = `${clean(itemLabel(d.itemKey))}/${clean(f.fileName)}`;
      for (let i = 2; used.has(name); i++) name = `${clean(itemLabel(d.itemKey))}/${i}-${clean(f.fileName)}`;
      used.add(name);
      files.push({ name, data: f.bytes });
    } catch {
      // Missing file on disk: skip it rather than fail the whole download.
    }
  }
  const zip = buildZip(files);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${clean(p.employeeName)} - personnel file.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
