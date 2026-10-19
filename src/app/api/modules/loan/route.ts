import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { companyName, parseBody, staffName } from "@/lib/modules/common";
import { BUILTIN_REASONS, money } from "@/lib/modules/aod-options";
import { FOLDER, SLUG, aodInput, currentPeriod, reasonsFor, serializeAod } from "@/lib/modules/aod-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { peopleDirectory } from "@/lib/modules/people";
import { saveDataUrlUpload } from "@/lib/uploads";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const [records, reasons, directory, payrollStaff, payroll, company, me] = await Promise.all([
    db.loanDeductibleRecord.findMany({ where: { organizationId: orgId }, include: { payments: true }, orderBy: { createdAt: "desc" } }),
    reasonsFor(orgId, true),
    peopleDirectory(orgId),
    db.payrollEmployee.findMany({ where: { organizationId: orgId, active: true }, select: { fullName: true, employeeNumber: true, phone: true, idNumber: true, monthlySalaryCents: true } }),
    db.subscription.findFirst({ where: { organizationId: orgId, productSlug: "payroll", status: "active" } }),
    companyName(orgId),
    staffName(gate.session.userId),
  ]);
  const people = new Map(directory.map((p) => [p.name.toLowerCase(), { ...p, idNumber: null as string | null, salary: null as number | null }]));
  for (const e of payrollStaff) {
    const prev = people.get(e.fullName.toLowerCase());
    people.set(e.fullName.toLowerCase(), {
      name: e.fullName,
      employeeNumber: e.employeeNumber ?? prev?.employeeNumber ?? null,
      phone: e.phone ?? prev?.phone ?? null,
      email: prev?.email ?? null,
      jobTitle: prev?.jobTitle ?? null,
      idNumber: e.idNumber,
      salary: e.monthlySalaryCents ? e.monthlySalaryCents / 100 : null,
    });
  }
  const custom = await db.aodReason.findMany({ where: { organizationId: orgId }, orderBy: { label: "asc" } });
  return NextResponse.json({
    company,
    me,
    canManage: gate.access.role !== "MEMBER",
    period: currentPeriod(),
    payrollLinked: !!payroll,
    reasons: reasons.filter((r) => !r.custom),
    customReasons: custom.map((c) => ({ id: c.id, key: `c:${c.id}`, label: c.label, kind: c.kind, archived: c.archived })),
    records: records.map((r) => serializeAod(r)),
    people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
  });
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const body = await parseBody(req, aodInput);
  if ("error" in body) return body.error;
  const b = body.data;

  const reason = b.reason;
  let reasonLabel: string | null = null;
  let kind: string;
  if (reason.startsWith("c:")) {
    const custom = await db.aodReason.findFirst({ where: { id: reason.slice(2), organizationId: orgId } });
    if (!custom) return NextResponse.json({ error: "That reason no longer exists." }, { status: 400 });
    reasonLabel = custom.label;
    kind = custom.kind;
  } else {
    const builtin = BUILTIN_REASONS.find((r) => r.key === reason);
    if (!builtin) return NextResponse.json({ error: "Choose a reason" }, { status: 400 });
    kind = builtin.kind;
    if (reason === "other") {
      if (!b.reasonLabel) return NextResponse.json({ error: "Type the reason" }, { status: 400 });
      reasonLabel = b.reasonLabel;
    }
  }
  if (b.instalmentAmount > b.amount) return NextResponse.json({ error: "The instalment cannot be more than the amount owed." }, { status: 400 });

  if (kind === "deductible" && b.repayMethod === "payroll") {
    const staff = await db.payrollEmployee.findFirst({
      where: { organizationId: orgId, active: true, ...(b.employeeNumber ? { employeeNumber: b.employeeNumber } : { fullName: b.employeeName }) },
      select: { monthlySalaryCents: true },
    });
    const cap = staff?.monthlySalaryCents ? staff.monthlySalaryCents / 400 : null;
    if (cap && b.instalmentAmount > cap + 0.005) {
      return NextResponse.json({ error: `For loss or damage the monthly deduction may not be more than a quarter of pay (${money(cap)} for this employee). Lower the instalment.` }, { status: 400 });
    }
  }

  const photos: string[] = [];
  for (const p of b.photos) photos.push(await saveDataUrlUpload(p, `${FOLDER}/${orgId}`));
  const record = await db.loanDeductibleRecord.create({
    data: {
      organizationId: orgId,
      reference: await nextDocumentNumber(orgId, "AOD"),
      employeeName: b.employeeName,
      employeeNumber: b.employeeNumber,
      employeePhone: b.employeePhone,
      employeeIdNumber: b.employeeIdNumber,
      recordType: kind,
      reason,
      reasonLabel,
      amount: b.amount,
      description: b.description,
      incidentDate: b.incidentDate ? new Date(`${b.incidentDate}T12:00:00+02:00`) : null,
      instalmentAmount: b.instalmentAmount,
      firstPeriod: b.firstPeriod,
      repayMethod: b.repayMethod,
      photosJson: JSON.stringify(photos),
      sourceRef: b.sourceRef,
      issuedBy: await staffName(gate.session.userId),
      status: "pending",
    },
    include: { payments: true },
  });
  return NextResponse.json({ record: serializeAod(record) });
}
