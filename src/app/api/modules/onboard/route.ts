import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { companyName, parseBody } from "@/lib/modules/common";
import { DEFAULT_ITEMS } from "@/lib/modules/onboard-items";
import { SLUG, packetInput, serializeSummary } from "@/lib/modules/onboard-server";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const [packets, leave] = await Promise.all([
    db.onboardingPacket.findMany({ where: { organizationId: orgId }, include: { documents: true }, orderBy: { createdAt: "desc" } }),
    db.subscription.findFirst({ where: { organizationId: orgId, productSlug: "leave-planner", status: "active" } }),
  ]);
  return NextResponse.json({
    company: await companyName(orgId),
    canManage: gate.access.role !== "MEMBER",
    leavePlanner: !!leave,
    packets: packets.map(serializeSummary),
  });
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const body = await parseBody(req, packetInput);
  if ("error" in body) return body.error;
  const b = body.data;
  const reqs = [...new Set(b.requirements?.length ? b.requirements : DEFAULT_ITEMS)];
  const packet = await db.onboardingPacket.create({
    data: {
      organizationId: gate.session.organizationId,
      employeeName: b.employeeName,
      employeePhone: b.employeePhone || null,
      employeeEmail: b.employeeEmail || null,
      employeeNumber: b.employeeNumber || null,
      jobTitle: b.jobTitle || null,
      department: b.department || null,
      startDate: b.startDate ? new Date(`${b.startDate}T12:00:00+02:00`) : null,
      requirementsJson: JSON.stringify(reqs),
    },
    include: { documents: true },
  });
  return NextResponse.json({ packet: serializeSummary(packet) });
}
