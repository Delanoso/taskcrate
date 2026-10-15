import { getProduct } from "@/data/products";
import { db } from "@/lib/db";
import { sendAlertEmail } from "@/lib/mail";

export function productLabel(slug: string | null | undefined) {
  if (!slug) return "General";
  return getProduct(slug)?.name ?? slug;
}

export async function notifyNewTicket(input: {
  ticketId: string;
  subject: string;
  body: string;
  companyName: string;
  fromName: string;
  fromEmail: string;
  productSlug: string | null;
  kind: "opened" | "reply";
}) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://taskcrate.co.za").replace(/\/$/, "");
  const result = await sendAlertEmail({
    subject: `[TaskCrate] ${input.kind === "opened" ? "New ticket" : "Ticket reply"}: ${input.subject}`,
    text: [
      input.kind === "opened" ? "A company opened a support ticket." : "A company added a message to a ticket.",
      "",
      `Company: ${input.companyName}`,
      `From: ${input.fromName} <${input.fromEmail}>`,
      `App: ${productLabel(input.productSlug)}`,
      `Subject: ${input.subject}`,
      "",
      input.body,
      "",
      `Open it: ${appUrl}/dashboard/admin/tickets/${input.ticketId}`,
    ].join("\n"),
  });

  if (!result.ok) {
    await db.supportTicket.update({
      where: { id: input.ticketId },
      data: { mailError: result.error },
    });
  } else {
    await db.supportTicket.update({
      where: { id: input.ticketId },
      data: { mailError: null },
    });
  }
  return result;
}

export function redirectTo(req: Request, path: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const base = configured || new URL(req.url).origin;
  return new URL(path, base.endsWith("/") ? base : `${base}/`);
}
