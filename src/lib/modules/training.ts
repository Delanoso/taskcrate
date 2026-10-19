import { z } from "zod";
import { db } from "@/lib/db";
import { photoSchema } from "@/lib/modules/common";
import { parseTrainingRows, type TrainingImportRow } from "@/lib/modules/training-import";
import { ticketState } from "@/lib/modules/training-shared";
import { rememberPerson } from "@/lib/modules/people";
import { saveDataUrlUpload } from "@/lib/uploads";

export class TrainingError extends Error {}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const ticketSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(2, "Add the person's name").max(160),
  employeeNumber: optionalText(40),
  ticketType: z.string().trim().min(2, "Add the ticket").max(80),
  certificateNumber: optionalText(80),
  provider: optionalText(120),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Add the issued date"),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Add the expiry date"),
  note: optionalText(300),
  photoDataUrl: photoSchema.optional().or(z.literal("")),
});

function blank(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function view(ticket: {
  id: string;
  fullName: string;
  employeeNumber: string | null;
  ticketType: string;
  certificateNumber: string | null;
  provider: string | null;
  issuedOn: string;
  expiresOn: string;
  photoUrl: string | null;
  note: string | null;
}) {
  return { ...ticket, state: ticketState(ticket.expiresOn) };
}

export async function trainingSnapshot(organizationId: string) {
  const tickets = await db.trainingTicket.findMany({
    where: { organizationId },
    orderBy: [{ expiresOn: "asc" }, { fullName: "asc" }],
  });
  return { tickets: tickets.map(view) };
}

export async function saveTrainingTicket(organizationId: string, raw: unknown) {
  const parsed = ticketSchema.safeParse(raw);
  if (!parsed.success) throw new TrainingError(parsed.error.issues[0]?.message ?? "Check the ticket");
  const data = parsed.data;
  if (data.expiresOn < data.issuedOn) throw new TrainingError("The expiry is before the issued date");
  if (!data.id && !data.photoDataUrl) throw new TrainingError("Add a photo of the card");
  const photoUrl = data.photoDataUrl ? await saveDataUrlUpload(data.photoDataUrl, `training/${organizationId}`) : undefined;
  const saved = {
    fullName: data.fullName,
    employeeNumber: blank(data.employeeNumber),
    ticketType: data.ticketType,
    certificateNumber: blank(data.certificateNumber),
    provider: blank(data.provider),
    issuedOn: data.issuedOn,
    expiresOn: data.expiresOn,
    note: blank(data.note),
    ...(photoUrl ? { photoUrl } : {}),
  };
  await rememberPerson(organizationId, { fullName: data.fullName, employeeNumber: blank(data.employeeNumber) });
  if (data.id) {
    const existing = await db.trainingTicket.findFirst({ where: { id: data.id, organizationId } });
    if (!existing) throw new TrainingError("Ticket not found");
    return db.trainingTicket.update({ where: { id: existing.id }, data: saved });
  }
  return db.trainingTicket.create({ data: { organizationId, ...saved, photoUrl: photoUrl! } });
}

export async function importTrainingTickets(organizationId: string, rows: TrainingImportRow[]) {
  const parsed = parseTrainingRows([
    ["Full name", "Employee number", "Ticket", "Certificate number", "Training provider", "Issued", "Expires"],
    ...rows.map((row) => [
      row.fullName ?? "",
      row.employeeNumber ?? "",
      row.ticketType ?? "",
      row.certificateNumber ?? "",
      row.provider ?? "",
      row.issuedOn ?? "",
      row.expiresOn ?? "",
    ]),
  ]);
  if (parsed.errors.length) throw new TrainingError(parsed.errors[0]);
  const existing = await db.trainingTicket.findMany({ where: { organizationId } });
  const keyOf = (name: string, number: string | null, ticket: string) =>
    `${(number || name).trim().toLowerCase()}|${ticket.trim().toLowerCase()}`;
  const byKey = new Map(existing.map((ticket) => [keyOf(ticket.fullName, ticket.employeeNumber, ticket.ticketType), ticket]));
  let created = 0;
  let updated = 0;
  await db.$transaction(async (tx) => {
    for (const row of parsed.rows) {
      const match = byKey.get(keyOf(row.fullName, row.employeeNumber, row.ticketType));
      if (match) {
        const saved = await tx.trainingTicket.update({
          where: { id: match.id },
          data: {
            fullName: row.fullName,
            employeeNumber: row.employeeNumber,
            ticketType: row.ticketType,
            certificateNumber: row.certificateNumber,
            provider: row.provider,
            issuedOn: row.issuedOn,
            expiresOn: row.expiresOn,
          },
        });
        byKey.set(keyOf(saved.fullName, saved.employeeNumber, saved.ticketType), saved);
        updated++;
      } else {
        const saved = await tx.trainingTicket.create({ data: { organizationId, ...row } });
        byKey.set(keyOf(saved.fullName, saved.employeeNumber, saved.ticketType), saved);
        created++;
      }
    }
  });
  return { created, updated };
}
