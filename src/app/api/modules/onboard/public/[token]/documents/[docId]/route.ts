import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound } from "@/lib/modules/common";
import { documentResponse, readDocument, removeDocument } from "@/lib/file-storage";
import { EDITABLE, FOLDER, loadPublicPacket } from "@/lib/modules/onboard-server";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const p = await loadPublicPacket(token);
  const doc = p?.documents.find((d) => d.id === docId);
  if (!doc) return notFound();
  try {
    return documentResponse(await readDocument(doc, FOLDER), false);
  } catch {
    return notFound();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await params;
  const p = await loadPublicPacket(token);
  const doc = p?.documents.find((d) => d.id === docId);
  if (!p || !doc) return notFound();
  if (!EDITABLE.includes(p.status)) return NextResponse.json({ error: "Your pack has been submitted and can no longer be changed." }, { status: 409 });
  await db.onboardingDocument.delete({ where: { id: doc.id } });
  await removeDocument(doc.fileUrl, FOLDER);
  return NextResponse.json({ ok: true });
}
