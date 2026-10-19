import { z } from "zod";
import { db } from "@/lib/db";

const personSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(2, "Add the full name").max(160),
  employeeNumber: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(160).optional(),
  idNumber: z.string().trim().max(20).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  active: z.boolean().optional(),
});

function blank(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listPeople(organizationId: string) {
  return db.person.findMany({ where: { organizationId }, orderBy: [{ active: "desc" }, { fullName: "asc" }] });
}

export async function savePerson(organizationId: string, raw: unknown) {
  const parsed = personSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the person");
  const data = {
    fullName: parsed.data.fullName,
    employeeNumber: blank(parsed.data.employeeNumber),
    phone: blank(parsed.data.phone),
    email: blank(parsed.data.email),
    idNumber: blank(parsed.data.idNumber),
    jobTitle: blank(parsed.data.jobTitle),
    active: parsed.data.active ?? true,
  };
  if (parsed.data.id) {
    const existing = await db.person.findFirst({ where: { id: parsed.data.id, organizationId } });
    if (!existing) throw new Error("That person was not found");
    return db.person.update({ where: { id: existing.id }, data });
  }
  return db.person.create({ data: { organizationId, ...data } });
}

export type Person = {
  name: string;
  employeeNumber: string | null;
  phone: string | null;
  email: string | null;
  jobTitle: string | null;
};

/** Names the other apps can pick from. Each app still stores the name on its own record. */
export async function peopleDirectory(organizationId: string): Promise<Person[]> {
  const people = await listPeople(organizationId);
  return people
    .filter((person) => person.active)
    .map((person) => ({
      name: person.fullName,
      employeeNumber: person.employeeNumber,
      phone: person.phone,
      email: person.email,
      jobTitle: person.jobTitle,
    }));
}

/** Copies a name into the staff list. The app that called this still keeps its own record. */
export async function rememberPerson(
  organizationId: string,
  input: { fullName: string; employeeNumber?: string | null; phone?: string | null; email?: string | null; idNumber?: string | null; jobTitle?: string | null },
) {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) return;
  const employeeNumber = input.employeeNumber?.trim() || null;
  const existing = employeeNumber
    ? await db.person.findFirst({ where: { organizationId, employeeNumber } })
    : await db.person.findFirst({ where: { organizationId, fullName } });
  const data = {
    fullName,
    employeeNumber,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    idNumber: input.idNumber?.trim() || null,
    jobTitle: input.jobTitle?.trim() || null,
  };
  if (existing) await db.person.update({ where: { id: existing.id }, data });
  else await db.person.create({ data: { organizationId, ...data } });
}
