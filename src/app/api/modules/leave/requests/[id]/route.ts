import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/client";
import { requireProductApi } from "@/lib/modules/api-guard";
import { leaveWhatsAppUrl, staffName } from "@/lib/modules/leave-server";

const SLUG = "leave-planner";
const employeeSelect = { id: true, fullName: true, phone: true, publicToken: true } as const;

async function load(id: string, organizationId: string) {
  return db.leaveRequest.findFirst({ where: { id, organizationId }, include: { employee: { select: employeeSelect } } });
}

/** WhatsApp link to (re)send the current outcome to the employee. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const r = await load((await params).id, gate.session.organizationId);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const event = r.status === "cancelled" ? "cancelled" : "decision";
  return NextResponse.json({ whatsAppUrl: await leaveWhatsAppUrl(r.organizationId, r, r.employee, event) });
}

/** Approve, decline or cancel a request. Cancelling returns the days to the balance. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const existing = await load((await params).id, gate.session.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = z
    .object({
      action: z.enum(["approve", "reject", "cancel"]),
      note: z.string().trim().max(500).optional(),
      days: z.number().min(0.5).max(365).multipleOf(0.5).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const { action, note, days } = parsed.data;
  const by = await staffName(gate.session.userId);

  let data;
  if (action === "cancel") {
    if (!["pending", "approved", "auto_approved"].includes(existing.status)) {
      return NextResponse.json({ error: "Only pending or approved leave can be cancelled." }, { status: 409 });
    }
    data = { status: "cancelled", cancelledAt: new Date(), decidedBy: by, decisionNote: note || existing.decisionNote };
  } else {
    if (!["pending", "blocked"].includes(existing.status)) {
      return NextResponse.json({ error: "This request has already been decided." }, { status: 409 });
    }
    data = {
      status: action === "approve" ? "approved" : "rejected",
      decidedAt: new Date(),
      decidedBy: by,
      decisionNote: note || null,
      ...(days !== undefined && action === "approve" ? { days } : {}),
    };
  }
  const updated = await db.leaveRequest.update({
    where: { id: existing.id },
    data,
    include: { employee: { select: employeeSelect } },
  });
  await db.notification.updateMany({
    where: { organizationId: existing.organizationId, productSlug: "leave-planner", readAt: null, dueAt: existing.startDate, body: { startsWith: `${existing.employeeName}:` } },
    data: { readAt: new Date() },
  });
  const whatsAppUrl = await leaveWhatsAppUrl(
    existing.organizationId,
    updated,
    updated.employee,
    action === "cancel" ? "cancelled" : "decision",
  );
  return NextResponse.json({ request: updated, whatsAppUrl });
}

/** Delete a request entirely — any days it used go back on the balance. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can delete leave." }, { status: 403 });
  }
  const { count } = await db.leaveRequest.deleteMany({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
