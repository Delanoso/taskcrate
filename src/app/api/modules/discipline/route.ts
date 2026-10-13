import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { companyName, managersOnly, parseBody, photoSchema, staffName } from "@/lib/modules/common";
import { OFFENCES } from "@/lib/modules/discipline-options";
import { FOLDER, SLUG, employeeFields, employeeKey, fromLocalDateTime, getSettings, opt, serializeCase } from "@/lib/modules/discipline-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { saveDataUrlUpload } from "@/lib/uploads";

const createInput = z.object({
  ...employeeFields,
  offenceKey: z.enum(OFFENCES.map((o) => o.key) as [string, ...string[]]),
  offence: z.string().trim().min(5, "Describe the charge").max(1000),
  incidentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Enter the date and time of the incident"),
  location: opt(200),
  witnesses: opt(500),
  notes: z.string().trim().min(5, "Describe what happened").max(5000),
  photos: z.array(photoSchema).max(8, "Up to 8 evidence photos").default([]),
});

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const [cases, settings, leaveStaff] = await Promise.all([
    db.disciplineEntry.findMany({ where: { organizationId: orgId }, orderBy: { incidentAt: "desc" } }),
    getSettings(orgId),
    db.leaveEmployee.findMany({ where: { organizationId: orgId, active: true }, select: { fullName: true, employeeNumber: true, phone: true } }),
  ]);

  // Directory for autocomplete: people already on file here plus the Leave Planner staff list.
  const directory = new Map<string, { employeeName: string; employeeNumber: string | null; employeePhone: string | null; jobTitle: string | null; department: string | null }>();
  for (const e of leaveStaff) {
    const p = { employeeName: e.fullName, employeeNumber: e.employeeNumber, employeePhone: e.phone, jobTitle: null, department: null };
    directory.set(employeeKey(p), p);
  }
  for (const c of [...cases].reverse()) {
    const p = { employeeName: c.employeeName, employeeNumber: c.employeeNumber, employeePhone: c.employeePhone, jobTitle: c.jobTitle, department: c.department };
    directory.set(employeeKey(p), { ...directory.get(employeeKey(p)), ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)) } as typeof p);
  }

  return NextResponse.json({
    company: await companyName(orgId),
    me: await staffName(gate.session.userId),
    canManage: gate.access.role !== "MEMBER",
    settings: { verbalMonths: settings.verbalMonths, writtenMonths: settings.writtenMonths, finalMonths: settings.finalMonths, defaultIssuer: settings.defaultIssuer },
    cases: cases.map(serializeCase),
    directory: [...directory.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
  });
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const body = await parseBody(req, createInput);
  if ("error" in body) return body.error;
  const b = body.data;
  const orgId = gate.session.organizationId;
  const incidentAt = fromLocalDateTime(b.incidentAt);
  if (Number.isNaN(incidentAt.getTime()) || incidentAt.getTime() > Date.now() + 5 * 60_000) {
    return NextResponse.json({ error: "The incident date cannot be in the future" }, { status: 400 });
  }
  const photos: string[] = [];
  for (const p of b.photos) photos.push(await saveDataUrlUpload(p, `${FOLDER}/${orgId}`));
  const offence = OFFENCES.find((o) => o.key === b.offenceKey)!;
  const created = await db.disciplineEntry.create({
    data: {
      organizationId: orgId,
      reference: await nextDocumentNumber(orgId, "DC"),
      employeeName: b.employeeName,
      employeeNumber: b.employeeNumber || null,
      employeePhone: b.employeePhone || null,
      jobTitle: b.jobTitle || null,
      department: b.department || null,
      stage: "pending",
      status: "open",
      offenceKey: b.offenceKey,
      offence: b.offence,
      offenceSeverity: offence.severity,
      incidentAt,
      location: b.location || null,
      witnesses: b.witnesses || null,
      notes: b.notes,
      photosJson: JSON.stringify(photos),
    },
  });
  return NextResponse.json({ case: serializeCase(created) });
}

export async function PUT(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "change discipline settings");
  if (denied) return denied;
  const months = z.number().int().min(1).max(36);
  const body = await parseBody(req, z.object({ verbalMonths: months, writtenMonths: months, finalMonths: months, defaultIssuer: opt(120) }));
  if ("error" in body) return body.error;
  const orgId = gate.session.organizationId;
  await getSettings(orgId);
  const s = await db.disciplineSettings.update({
    where: { organizationId: orgId },
    data: { ...body.data, defaultIssuer: body.data.defaultIssuer || null },
  });
  return NextResponse.json({ settings: { verbalMonths: s.verbalMonths, writtenMonths: s.writtenMonths, finalMonths: s.finalMonths, defaultIssuer: s.defaultIssuer } });
}
