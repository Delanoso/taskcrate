import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound } from "@/lib/modules/common";
import { documentResponse, readDocument } from "@/lib/file-storage";
import { FOLDER, SLUG } from "@/lib/modules/onboard-server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const { id, docId } = await params;
  const doc = await db.onboardingDocument.findFirst({ where: { id: docId, packetId: id, packet: { organizationId: gate.session.organizationId } } });
  if (!doc) return notFound();
  try {
    const file = await readDocument(doc, FOLDER);
    return documentResponse(file, new URL(req.url).searchParams.has("download"));
  } catch {
    return notFound();
  }
}
