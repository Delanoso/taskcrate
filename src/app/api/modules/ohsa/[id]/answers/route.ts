import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { AUDIT_QUESTION_IDS, MAX_PHOTOS_PER_QUESTION } from "@/lib/modules/ohsa-audit-items";
import { findAudit, parsePhotos, removeAuditPhoto } from "@/lib/modules/ohsa-server";
import { saveDataUrlUpload } from "@/lib/uploads";

const SLUG = "ohsa-mock-auditor";
const questionId = z.string().refine((id) => AUDIT_QUESTION_IDS.has(id), "Unknown question");

async function openAudit(req: Request, id: string) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return { error: gate.error };
  const audit = await findAudit(id, gate.session.organizationId);
  if (!audit) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (audit.status === "completed") {
    return { error: NextResponse.json({ error: "This audit is completed. Reopen it to make changes." }, { status: 409 }) };
  }
  return { audit, body: await req.json().catch(() => null) };
}

function upsert(auditId: string, qid: string, data: { answer?: string | null; note?: string | null; photosJson?: string }) {
  return db.ohsaAuditAnswer.upsert({
    where: { auditId_questionId: { auditId, questionId: qid } },
    create: { auditId, questionId: qid, ...data },
    update: data,
  });
}

/** Save an answer and/or note for one question. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await openAudit(req, (await params).id);
  if ("error" in ctx) return ctx.error;
  const parsed = z
    .object({
      questionId,
      answer: z.enum(["yes", "no", "na"]).nullable().optional(),
      note: z.string().max(2000).nullable().optional(),
    })
    .safeParse(ctx.body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const { questionId: qid, ...data } = parsed.data;
  if (data.note !== undefined) data.note = data.note?.trim() || null;
  await upsert(ctx.audit.id, qid, data);
  return NextResponse.json({ ok: true });
}

/** Add a photo (compressed JPEG/PNG data URL) to a question. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await openAudit(req, (await params).id);
  if ("error" in ctx) return ctx.error;
  const parsed = z
    .object({
      questionId,
      dataUrl: z.string().regex(/^data:image\/(jpeg|png);base64,/, "Photo must be a JPG or PNG").max(6_000_000, "Photo is too large"),
    })
    .safeParse(ctx.body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const existing = await db.ohsaAuditAnswer.findUnique({
    where: { auditId_questionId: { auditId: ctx.audit.id, questionId: parsed.data.questionId } },
  });
  const photos = parsePhotos(existing?.photosJson ?? "[]");
  if (photos.length >= MAX_PHOTOS_PER_QUESTION) {
    return NextResponse.json({ error: `Up to ${MAX_PHOTOS_PER_QUESTION} photos per question.` }, { status: 400 });
  }
  const url = await saveDataUrlUpload(parsed.data.dataUrl, `ohsa/${ctx.audit.organizationId}`);
  photos.push(url);
  await upsert(ctx.audit.id, parsed.data.questionId, { photosJson: JSON.stringify(photos) });
  return NextResponse.json({ ok: true, url, photos });
}

/** Remove one photo from a question. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await openAudit(req, (await params).id);
  if ("error" in ctx) return ctx.error;
  const parsed = z.object({ questionId, url: z.string() }).safeParse(ctx.body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const existing = await db.ohsaAuditAnswer.findUnique({
    where: { auditId_questionId: { auditId: ctx.audit.id, questionId: parsed.data.questionId } },
  });
  const photos = parsePhotos(existing?.photosJson ?? "[]");
  if (!photos.includes(parsed.data.url)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const next = photos.filter((u) => u !== parsed.data.url);
  await upsert(ctx.audit.id, parsed.data.questionId, { photosJson: JSON.stringify(next) });
  await removeAuditPhoto(parsed.data.url, ctx.audit.organizationId);
  return NextResponse.json({ ok: true, photos: next });
}
