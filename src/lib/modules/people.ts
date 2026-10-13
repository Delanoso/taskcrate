import { db } from "@/lib/db";

export type Person = { name: string; employeeNumber: string | null; phone: string | null; email: string | null; jobTitle: string | null };

/** Known employees from Leave Planner and approved onboarding packets, for name pickers. */
export async function peopleDirectory(organizationId: string): Promise<Person[]> {
  const [leaveEmployees, packets] = await Promise.all([
    db.leaveEmployee.findMany({ where: { organizationId, active: true }, select: { fullName: true, employeeNumber: true, phone: true }, orderBy: { fullName: "asc" } }),
    db.onboardingPacket.findMany({
      where: { organizationId, status: { in: ["submitted", "approved", "completed"] } },
      select: { employeeName: true, employeeNumber: true, employeePhone: true, employeeEmail: true, jobTitle: true },
    }),
  ]);
  const directory = new Map<string, Person>();
  for (const p of packets) directory.set(p.employeeName.toLowerCase(), { name: p.employeeName, employeeNumber: p.employeeNumber, phone: p.employeePhone, email: p.employeeEmail, jobTitle: p.jobTitle });
  for (const e of leaveEmployees) {
    const prev = directory.get(e.fullName.toLowerCase());
    directory.set(e.fullName.toLowerCase(), {
      name: e.fullName,
      employeeNumber: e.employeeNumber ?? prev?.employeeNumber ?? null,
      phone: e.phone ?? prev?.phone ?? null,
      email: prev?.email ?? null,
      jobTitle: prev?.jobTitle ?? null,
    });
  }
  return [...directory.values()].sort((a, b) => a.name.localeCompare(b.name));
}
