import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { jsonList, managersOnly, notFound, parseBody, removeUpload, staffName } from "@/lib/modules/common";
import { CATEGORIES, SEVERITY_KEYS } from "@/lib/modules/nearmiss-options";
import { SLUG, serializeReport } from "@/lib/modules/nearmiss-server";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
const text = (max: number) => z.string().trim().max(max).nullable().optional();

const action = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("triage"),
    category: z.enum(CATEGORIES).nullable().optional(),
    riskRating: z.enum(SEVERITY_KEYS).nullable().optional(),
    assignedTo: text(120),
    correctiveAction: text(2000),
    dueDate: dateKey.nullable().optional(),
    feedback: text(1000),
  }),
  z.object({ action: z.literal("close"), closeOutNote: z.string().trim().min(3, "Say what was done to close it out").max(2000), feedback: text(1000) }),
  z.object({ action: z.literal("reopen") }),
]);

async function findReport(id: string, organizationId: string) {
  return db.nearMissReport.findFirst({ where: { id, organizationId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const report = await findReport((await params).id, gate.session.organizationId);
  if (!report) return notFound();
  const body = await parseBody(req, action);
  if ("error" in body) return body.error;
  const b = body.data;

  let data;
  if (b.action === "triage") {
    if (report.status === "closed") return NextResponse.json({ error: "Reopen the report before changing the action plan." }, { status: 409 });
    data = {
      category: b.category ?? null,
      riskRating: b.riskRating ?? null,
      assignedTo: b.assignedTo || null,
      correctiveAction: b.correctiveAction || null,
      dueDate: b.dueDate ? new Date(`${b.dueDate}T12:00:00+02:00`) : null,
      feedback: b.feedback || null,
      status: "triaged",
      triagedAt: report.triagedAt ?? new Date(),
    };
  } else if (b.action === "close") {
    data = {
      status: "closed",
      closeOutNote: b.closeOutNote,
      feedback: b.feedback === undefined ? report.feedback : b.feedback || null,
      closedAt: new Date(),
      closedBy: await staffName(gate.session.userId),
      triagedAt: report.triagedAt ?? new Date(),
    };
  } else {
    data = { status: "triaged", closedAt: null, closedBy: null };
  }
  const updated = await db.nearMissReport.update({ where: { id: report.id }, data });
  return NextResponse.json({ report: serializeReport(updated) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "delete reports");
  if (denied) return denied;
  const report = await findReport((await params).id, gate.session.organizationId);
  if (!report) return notFound();
  await db.nearMissReport.delete({ where: { id: report.id } });
  const files = [...jsonList(report.photosJson), ...jsonList(report.closeOutPhotosJson), report.photoUrl].filter((u): u is string => !!u);
  await Promise.all(files.map((u) => removeUpload(u, "nearmiss", report.organizationId)));
  return NextResponse.json({ ok: true });
}
