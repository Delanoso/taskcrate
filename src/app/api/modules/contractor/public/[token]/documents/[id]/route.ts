import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentResponse, readSafetyFileDocument, removeSafetyFileDocument } from "@/lib/safety-file-storage";

async function findDoc(token: string, id: string) {
  return db.contractorDocument.findFirst({ where: { id, contractor: { publicToken: token } } });
}

/** Contractor viewing their own upload via the secure link. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const doc = await findDoc(token, id);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  try {
    return documentResponse(await readSafetyFileDocument(doc), new URL(req.url).searchParams.has("download"));
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}

/** Contractor removing a wrong upload. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const doc = await findDoc(token, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.contractorDocument.delete({ where: { id: doc.id } });
  await removeSafetyFileDocument(doc.fileUrl);
  return NextResponse.json({ ok: true });
}
