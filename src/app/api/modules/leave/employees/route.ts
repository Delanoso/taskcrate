import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { employeeData, employeeInput } from "@/lib/modules/leave-employee-schema";
import { rememberPerson } from "@/lib/modules/people";

const SLUG = "leave-planner";

/** Add one employee. */
export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const parsed = employeeInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const fields = employeeData(parsed.data);
  const employee = await db.leaveEmployee.create({
    data: { organizationId: gate.session.organizationId, ...fields },
  });
  await rememberPerson(gate.session.organizationId, fields);
  return NextResponse.json({ employee });
}

/** Bulk import. Rows matching an existing employee (by employee number, else by name) update that employee. */
export async function PUT(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const body = z.object({ rows: z.array(z.unknown()).min(1, "Nothing to import").max(1000) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const parsedRows = body.data.rows.map((raw) => employeeInput.safeParse(raw));
  const errors = parsedRows.flatMap((r, i) => (r.success ? [] : [`Row ${i + 1}: ${r.error.issues[0]?.message}`]));
  if (errors.length) return NextResponse.json({ error: "Fix these rows and try again.", errors }, { status: 400 });
  const rows = parsedRows.map((r) => r.data!);

  const organizationId = gate.session.organizationId;
  const existing = await db.leaveEmployee.findMany({ where: { organizationId } });
  const byNumber = new Map(existing.filter((e) => e.employeeNumber).map((e) => [e.employeeNumber!.toLowerCase(), e]));
  const byName = new Map(existing.map((e) => [e.fullName.toLowerCase(), e]));

  let created = 0;
  let updated = 0;
  await db.$transaction(async (tx) => {
    for (const row of rows) {
      const match =
        (row.employeeNumber && byNumber.get(row.employeeNumber.toLowerCase())) || byName.get(row.fullName.toLowerCase());
      if (match) {
        await tx.leaveEmployee.update({ where: { id: match.id }, data: { ...employeeData(row), active: true } });
        updated++;
      } else {
        const e = await tx.leaveEmployee.create({ data: { organizationId, ...employeeData(row) } });
        byName.set(e.fullName.toLowerCase(), e);
        if (e.employeeNumber) byNumber.set(e.employeeNumber.toLowerCase(), e);
        created++;
      }
    }
  });
  return NextResponse.json({ created, updated });
}
