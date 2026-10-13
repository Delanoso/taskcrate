import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { jsonList, notFound, parseBody, photoSchema, removeUpload } from "@/lib/modules/common";
import { FOLDER, SLUG, serializeCase } from "@/lib/modules/discipline-server";
import { saveDataUrlUpload } from "@/lib/uploads";

const MAX = 12;

async function load(id: string, organizationId: string) {
  return db.disciplineEntry.findFirst({ where: { id, organizationId } });
}

/** Evidence photos: scene, damaged items, or photographed documents such as a signed statement. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const c = await load((await params).id, gate.session.organizationId);
  if (!c) return notFound();
  const body = await parseBody(req, z.object({ dataUrl: photoSchema }));
  if ("error" in body) return body.error;
  const photos = jsonList(c.photosJson);
  if (photos.length >= MAX) return NextResponse.json({ error: `Up to ${MAX} evidence photos per case.` }, { status: 400 });
  photos.push(await saveDataUrlUpload(body.data.dataUrl, `${FOLDER}/${c.organizationId}`));
  const updated = await db.disciplineEntry.update({ where: { id: c.id }, data: { photosJson: JSON.stringify(photos) } });
  return NextResponse.json({ case: serializeCase(updated) });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const c = await load((await params).id, gate.session.organizationId);
  if (!c) return notFound();
  if (c.status === "finalised") return NextResponse.json({ error: "Evidence on a finalised case cannot be removed." }, { status: 409 });
  const body = await parseBody(req, z.object({ url: z.string() }));
  if ("error" in body) return body.error;
  const photos = jsonList(c.photosJson);
  const legacy = c.photoUrl === body.data.url;
  if (!photos.includes(body.data.url) && !legacy) return notFound();
  const updated = await db.disciplineEntry.update({
    where: { id: c.id },
    data: { photosJson: JSON.stringify(photos.filter((u) => u !== body.data.url)), ...(legacy ? { photoUrl: null } : {}) },
  });
  await removeUpload(body.data.url, FOLDER, c.organizationId);
  return NextResponse.json({ case: serializeCase(updated) });
}
