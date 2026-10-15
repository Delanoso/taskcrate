import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { notifyNewTicket, redirectTo } from "@/lib/support";

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
    if (!ticket || ticket.status !== "open" || body.length < 2) {
      return NextResponse.redirect(redirectTo(req, "/dashboard/support?error=1"));
    }
    await db.supportReply.create({
      data: { ticketId: ticket.id, userId: session.userId, body: body.slice(0, 4000) },
    });
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

  return NextResponse.redirect(redirectTo(req, `/dashboard/support/${ticket.id}?sent=1`));
}
