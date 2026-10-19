import { db } from "@/lib/db";

export type DutyPerson = { name: string; employeeNumber?: string | null };

function saToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

function saDayStart() {
  return new Date(`${saToday()}T00:00:00+02:00`);
}

function samePerson(aName: string, aNumber: string | null | undefined, bName: string, bNumber: string | null | undefined) {
  const left = aNumber?.trim().toLowerCase();
  const right = bNumber?.trim().toLowerCase();
  if (left && right && left === right) return true;
  return aName.trim().toLowerCase() === bName.trim().toLowerCase();
}

/** Reasons this person cannot start work today. Empty means they can. */
export async function dutyBlockReasons(organizationId: string, people: DutyPerson[]) {
  const named = people.filter((person) => person.name.trim().length >= 2);
  if (!named.length) return [];
  const today = saToday();
  const [tickets, checks] = await Promise.all([
    db.trainingTicket.findMany({ where: { organizationId, expiresOn: { lt: today } } }),
    db.fitForDutyCheck.findMany({
      where: { createdAt: { gte: saDayStart() }, site: { organizationId } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const reasons: string[] = [];
  for (const person of named) {
    const name = person.name.trim();
    for (const ticket of tickets) {
      if (!samePerson(name, person.employeeNumber, ticket.fullName, ticket.employeeNumber)) continue;
      reasons.push(`${name}: ${ticket.ticketType} expired on ${ticket.expiresOn}.`);
    }
    const latest = checks.find((check) => samePerson(name, person.employeeNumber, check.employeeName, check.employeeNumber));
    if (latest?.status === "FAILED") reasons.push(`${name} failed the fit-for-duty check today.`);
  }
  return reasons;
}
