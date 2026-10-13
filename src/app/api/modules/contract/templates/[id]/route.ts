import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, parseBody } from "@/lib/modules/common";
import { documentResponse, readDocument, removeDocument } from "@/lib/file-storage";
import { FOLDER, SLUG, serializeTemplate, templateInput } from "@/lib/modules/contract-server";
import { z } from "zod";

const patchInput = templateInput.partial().extend({ archived: z.boolean().optional() });

/** The uploaded PDF of a pdf template. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const t = await db.contractTemplate.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!t?.fileUrl) return notFound();
  try {
    return documentResponse(await readDocument({ fileUrl: t.fileUrl, fileName: t.fileName, mimeType: "application/pdf" }, FOLDER), false);
  } catch {
    return notFound();
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "manage templates");
  if (denied) return denied;
  const t = await db.contractTemplate.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!t) return notFound();
  const body = await parseBody(req, patchInput);
  if ("error" in body) return body.error;
  const b = body.data;
  if (t.kind === "text" && b.bodyText !== undefined && b.bodyText.trim().length < 20) return NextResponse.json({ error: "The document text is too short" }, { status: 400 });
  const updated = await db.contractTemplate.update({
    where: { id: t.id },
    data: {
      ...(b.name !== undefined ? { name: b.name } : {}),
      ...(b.category !== undefined ? { category: b.category } : {}),
      ...(b.bodyText !== undefined && t.kind === "text" ? { bodyText: b.bodyText.trim() } : {}),
      ...(b.requireCountersign !== undefined ? { requireCountersign: b.requireCountersign } : {}),
      ...(b.dueDays !== undefined ? { dueDays: b.dueDays } : {}),
      ...(b.archived !== undefined ? { archived: b.archived } : {}),
    },
  });
  return NextResponse.json({ template: serializeTemplate(updated) });
}

/** Templates that were already sent are archived instead, so the signed documents keep their source. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "manage templates");
  if (denied) return denied;
  const t = await db.contractTemplate.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!t) return notFound();
  const used = await db.contractDocument.count({ where: { templateId: t.id } });
  if (used) {
    const updated = await db.contractTemplate.update({ where: { id: t.id }, data: { archived: true } });
    return NextResponse.json({ archived: true, template: serializeTemplate(updated) });
  }
  await db.contractTemplate.delete({ where: { id: t.id } });
  if (t.fileUrl) await removeDocument(t.fileUrl, FOLDER);
  return NextResponse.json({ ok: true });
}
