import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/client";
import { requireProductApi } from "@/lib/modules/api-guard";
import { documentResponse, readSafetyFileDocument, removeSafetyFileDocument } from "@/lib/safety-file-storage";

const SLUG = "contractor-safety-file";

async function findDoc(id: string, organizationId: string) {
  return db.contractorDocument.findFirst({ where: { id, contractor: { organizationId } } });
}

/** View (inline) or download (?download=1) a contractor document. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const doc = await findDoc((await params).id, gate.session.organizationId);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await readSafetyFileDocument(doc);
    return documentResponse(file, new URL(req.url).searchParams.has("download"));
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can delete documents." }, { status: 403 });
  }
  const doc = await findDoc((await params).id, gate.session.organizationId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.contractorDocument.delete({ where: { id: doc.id } });
  await removeSafetyFileDocument(doc.fileUrl);
  return NextResponse.json({ ok: true });
}
