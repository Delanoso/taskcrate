import { requireProductApi } from "@/lib/modules/api-guard";
import { trainingSnapshot } from "@/lib/modules/training";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi("training-tickets");
  if ("error" in gate) return gate.error;
  const { tickets } = await trainingSnapshot(gate.session.organizationId);
  const rows = tickets.map((ticket) => [
    ticket.fullName,
    ticket.employeeNumber ?? "",
    ticket.ticketType,
    ticket.certificateNumber ?? "",
    ticket.provider ?? "",
    ticket.issuedOn,
    ticket.expiresOn,
    ticket.state,
    ticket.photoUrl ? "Yes" : "No",
    ticket.note ?? "",
  ]);
  const bytes = buildXlsx({
    sheetName: "Tickets",
    headers: ["Full name", "Employee number", "Ticket", "Certificate number", "Training provider", "Issued", "Expires", "Status", "Photo on file", "Note"],
    rows,
    widths: [24, 16, 28, 20, 22, 14, 14, 12, 14, 24],
  });
  return xlsxResponse(bytes, "Training and tickets");
}
