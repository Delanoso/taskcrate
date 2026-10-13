import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, parseBody, removeUpload, staffName } from "@/lib/modules/common";
import { removeDocument } from "@/lib/file-storage";
import { DEFAULT_ITEMS } from "@/lib/modules/onboard-items";
import { FOLDER, SLUG, decrypt, packetInput, serializeDetail } from "@/lib/modules/onboard-server";
import type { Personal } from "@/lib/modules/onboard-items";

const action = z.discriminatedUnion("action", [
  packetInput.extend({ action: z.literal("update") }),
  z.object({ action: z.literal("request_changes"), note: z.string().trim().min(3, "Say what needs to be fixed").max(2000) }),
  z.object({ action: z.literal("approve"), addToLeave: z.boolean().optional(), monthlyAccrual: z.number().min(0).max(5).optional() }),
  z.object({ action: z.literal("reopen") }),
]);

const load = (id: string, organizationId: string) =>
  db.onboardingPacket.findFirst({ where: { id, organizationId }, include: { documents: { orderBy: { createdAt: "asc" } } } });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const p = await load((await params).id, gate.session.organizationId);
  if (!p) return notFound();
  return NextResponse.json({ packet: serializeDetail(p) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const p = await load((await params).id, orgId);
  if (!p) return notFound();
  const body = await parseBody(req, action);
  if ("error" in body) return body.error;
  const b = body.data;
  let data: Prisma.OnboardingPacketUpdateInput;

  if (b.action === "update") {
    if (p.status === "approved") return NextResponse.json({ error: "Reopen the packet before editing it." }, { status: 409 });
    data = {
      employeeName: b.employeeName,
      employeePhone: b.employeePhone || null,
      employeeEmail: b.employeeEmail || null,
      employeeNumber: b.employeeNumber || null,
      jobTitle: b.jobTitle || null,
      department: b.department || null,
      startDate: b.startDate ? new Date(`${b.startDate}T12:00:00+02:00`) : null,
      ...(b.requirements ? { requirementsJson: JSON.stringify([...new Set(b.requirements.length ? b.requirements : DEFAULT_ITEMS)]) } : {}),
    };
  } else if (b.action === "request_changes") {
    if (p.status === "approved") return NextResponse.json({ error: "Reopen the packet first." }, { status: 409 });
    data = { status: "changes_requested", reviewNote: b.note, reviewedAt: new Date(), reviewedBy: await staffName(gate.session.userId) };
  } else if (b.action === "approve") {
    const denied = managersOnly(gate.access, "approve onboarding packets");
    if (denied) return denied;
    if (p.status !== "submitted" && p.status !== "completed") return NextResponse.json({ error: "Only submitted packs can be approved." }, { status: 409 });
    data = { status: "approved", reviewNote: null, reviewedAt: new Date(), reviewedBy: await staffName(gate.session.userId) };
    if (b.addToLeave && !p.leaveEmployeeId) {
      const leave = await db.subscription.findFirst({ where: { organizationId: orgId, productSlug: "leave-planner", status: "active" } });
      if (!leave) return NextResponse.json({ error: "Your company does not subscribe to Leave Planner." }, { status: 400 });
      const personal = decrypt<Personal>(p.personalJson);
      const start = p.startDate ?? new Date();
      const emp = await db.leaveEmployee.create({
        data: {
          organizationId: orgId,
          fullName: personal ? `${personal.firstNames} ${personal.surname}` : p.employeeName,
          employeeNumber: p.employeeNumber,
          phone: personal?.cellphone ?? p.employeePhone,
          startDate: start,
          balanceDate: start,
          annualDays: Math.round((b.monthlyAccrual ?? 1.25) * 12 * 10000) / 10000,
        },
      });
      data.leaveEmployeeId = emp.id;
    }
  } else {
    if (p.status !== "approved" && p.status !== "changes_requested") return NextResponse.json({ error: "Nothing to reopen." }, { status: 409 });
    data = { status: p.submittedAt ? "submitted" : "in_progress", reviewNote: null };
  }

  await db.onboardingPacket.update({ where: { id: p.id }, data });
  return NextResponse.json({ packet: serializeDetail((await load(p.id, orgId))!) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "delete onboarding packets");
  if (denied) return denied;
  const p = await load((await params).id, gate.session.organizationId);
  if (!p) return notFound();
  await db.onboardingPacket.delete({ where: { id: p.id } });
  await Promise.all([
    ...p.documents.map((d) => removeDocument(d.fileUrl, FOLDER)),
    ...[p.idDocUrl, p.addressDocUrl, p.consentSignature].filter((u): u is string => !!u).map((u) => removeUpload(u, FOLDER, p.organizationId)),
  ]);
  return NextResponse.json({ ok: true });
}
