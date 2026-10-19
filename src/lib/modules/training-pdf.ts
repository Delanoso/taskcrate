import { db } from "@/lib/db";
import { TrainingError } from "@/lib/modules/training";
import { ticketState } from "@/lib/modules/training-shared";
import { createBrandedDocument } from "@/lib/modules/pdf-kit";

export async function buildTrainingPdf(organizationId: string, id: string) {
  const ticket = await db.trainingTicket.findFirst({ where: { id, organizationId } });
  if (!ticket) throw new TrainingError("Ticket not found");
  const doc = await createBrandedDocument({
    organizationId,
    title: "Training ticket",
    documentNumber: ticket.certificateNumber || ticket.id.slice(-6).toUpperCase(),
  });
  doc.heading(ticket.ticketType);
  doc.field("Person", ticket.fullName);
  doc.field("Employee number", ticket.employeeNumber);
  doc.field("Certificate number", ticket.certificateNumber);
  doc.field("Training provider", ticket.provider);
  doc.field("Issued", ticket.issuedOn);
  doc.field("Expires", ticket.expiresOn);
  doc.field("Status", ticketState(ticket.expiresOn));
  doc.field("Note", ticket.note);
  if (ticket.photoUrl) {
    doc.heading("Card");
    await doc.imageRow([ticket.photoUrl], 220);
  }
  return { bytes: await doc.finish(), fileName: `${ticket.fullName} ${ticket.ticketType}` };
}
