import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { notifyNewTicket, redirectTo } from "@/lib/support";
import { appOrigin, sendEmail } from "@/lib/email";
import { allow } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(redirectTo(req, "/login"));

  const form = await req.formData();
  const intent = String(form.get("intent") ?? "create");

  if (intent === "reply") {
    const ticketId = String(form.get("ticketId") ?? "");
    const body = String(form.get("body") ?? "").trim();
    const ticket = await db.supportTicket.findFirst({
      where: { id: ticketId, organizationId: session.organizationId },
      include: { organization: true, user: true },
    });
    if (!ticket) return NextResponse.redirect(redirectTo(req, "/dashboard/support"));
    if (body.length < 2) return NextResponse.redirect(redirectTo(req, `/dashboard/support/${ticket.id}?error=short`));
    if (!allow(`support:${session.userId}`, 30, 60 * 60_000)) return NextResponse.redirect(redirectTo(req, `/dashboard/support/${ticket.id}?error=busy`));
    await db.supportReply.create({
      data: { ticketId: ticket.id, userId: session.userId, body: body.slice(0, 4000) },
    });
    if (ticket.status !== "open") await db.supportTicket.update({ where: { id: ticket.id }, data: { status: "open" } });
    const author = await db.user.findUnique({ where: { id: session.userId } });
    await notifyNewTicket({
      ticketId: ticket.id,
      subject: ticket.subject,
      body: body.slice(0, 4000),
      companyName: ticket.organization.name,
      fromName: author?.fullName ?? ticket.user.fullName,
      fromEmail: author?.email ?? ticket.user.email,
      productSlug: ticket.productSlug,
      kind: "reply",
    });
    return NextResponse.redirect(redirectTo(req, `/dashboard/support/${ticket.id}?sent=1`));
  }

  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const productSlug = String(form.get("productSlug") ?? "").trim();
  if (subject.length < 3 || body.length < 10) {
    return NextResponse.redirect(redirectTo(req, "/dashboard/support?error=1"));
  }
  if (!allow(`support:${session.userId}`, 30, 60 * 60_000)) {
    return NextResponse.redirect(redirectTo(req, "/dashboard/support?error=busy"));
  }

  const [org, user] = await Promise.all([
    db.organization.findUnique({ where: { id: session.organizationId } }),
    db.user.findUnique({ where: { id: session.userId } }),
  ]);
  if (!org || !user) return NextResponse.redirect(redirectTo(req, "/login"));

  const ticket = await db.supportTicket.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      subject: subject.slice(0, 140),
      body: body.slice(0, 4000),
      productSlug: productSlug || null,
    },
  });

  await notifyNewTicket({
    ticketId: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    companyName: org.name,
    fromName: user.fullName,
    fromEmail: user.email,
    productSlug: ticket.productSlug,
    kind: "opened",
  });
  await sendEmail({
    to: user.email,
    organizationId: org.id,
    kind: "ticket_received",
    subject: `We received your ticket: ${ticket.subject}`,
    greeting: `Hi ${user.fullName.split(" ")[0]},`,
    lines: ["Thanks for getting in touch. Your support ticket is open and we will reply as soon as we can, usually within one working day.", `> ${ticket.body}`, "We will email you when we reply."],
    button: { label: "Open the ticket", url: `${appOrigin()}/dashboard/support/${ticket.id}` },
  });

  return NextResponse.redirect(redirectTo(req, `/dashboard/support/${ticket.id}?sent=1`));
}
