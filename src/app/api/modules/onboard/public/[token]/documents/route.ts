import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound } from "@/lib/modules/common";
import { saveDocument } from "@/lib/file-storage";
import { jsonList } from "@/lib/modules/common";
import { EDITABLE, FOLDER, loadPublicPacket } from "@/lib/modules/onboard-server";

const MAX_PER_ITEM = 6;

/** multipart: itemKey + one or more `file` entries (PDF or photo). */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const p = await loadPublicPacket((await params).token);
  if (!p) return notFound();
  if (!EDITABLE.includes(p.status)) return NextResponse.json({ error: "Your pack has been submitted and can no longer be changed." }, { status: 409 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload a file." }, { status: 400 });
  }
  const itemKey = String(form.get("itemKey") ?? "");
  if (!jsonList(p.requirementsJson).includes(itemKey)) return NextResponse.json({ error: "That document is not on your checklist." }, { status: 400 });
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  const existing = p.documents.filter((d) => d.itemKey === itemKey).length;
  if (existing + files.length > MAX_PER_ITEM) return NextResponse.json({ error: `Up to ${MAX_PER_ITEM} files per document.` }, { status: 400 });

  const saved = [];
  for (const f of files) {
    try {
      saved.push(await saveDocument(f, FOLDER, p.organizationId, 10 * 1024 * 1024));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
    }
  }
  await db.$transaction([
    ...saved.map((s) => db.onboardingDocument.create({ data: { packetId: p.id, itemKey, ...s } })),
    db.onboardingPacket.update({ where: { id: p.id }, data: { status: p.status === "sent" ? "in_progress" : p.status } }),
  ]);
  return NextResponse.json({ ok: true });
}
