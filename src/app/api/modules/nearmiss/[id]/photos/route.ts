import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { jsonList, notFound, parseBody, photoSchema, removeUpload } from "@/lib/modules/common";
import { MAX_REPORT_PHOTOS } from "@/lib/modules/nearmiss-options";
import { SLUG, serializeReport } from "@/lib/modules/nearmiss-server";
import { saveDataUrlUpload } from "@/lib/uploads";

/** Close-out ("after") photos showing the hazard was fixed. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const report = await db.nearMissReport.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!report) return notFound();
  const body = await parseBody(req, z.object({ dataUrl: photoSchema }));
  if ("error" in body) return body.error;
  const photos = jsonList(report.closeOutPhotosJson);
  if (photos.length >= MAX_REPORT_PHOTOS) {
    return NextResponse.json({ error: `Up to ${MAX_REPORT_PHOTOS} close-out photos.` }, { status: 400 });
  }
  photos.push(await saveDataUrlUpload(body.data.dataUrl, `nearmiss/${report.organizationId}`));
  const updated = await db.nearMissReport.update({ where: { id: report.id }, data: { closeOutPhotosJson: JSON.stringify(photos) } });
  return NextResponse.json({ report: serializeReport(updated) });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const report = await db.nearMissReport.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!report) return notFound();
  const body = await parseBody(req, z.object({ url: z.string() }));
  if ("error" in body) return body.error;
  const photos = jsonList(report.closeOutPhotosJson);
  if (!photos.includes(body.data.url)) return notFound();
  const updated = await db.nearMissReport.update({
    where: { id: report.id },
    data: { closeOutPhotosJson: JSON.stringify(photos.filter((u) => u !== body.data.url)) },
  });
  await removeUpload(body.data.url, "nearmiss", report.organizationId);
  return NextResponse.json({ report: serializeReport(updated) });
}
