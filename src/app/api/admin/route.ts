import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSession, getSession } from "@/lib/session";
import { redirectTo } from "@/lib/support";

async function requireAdmin(req: Request) {
  const session = await getSession();
  if (!session) return { error: NextResponse.redirect(redirectTo(req, "/login")) } as const;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, fullName: true, platformAdmin: true },
  });
  if (!isPlatformAdmin(user)) {
    return { error: NextResponse.redirect(redirectTo(req, "/dashboard")) } as const;
  }
  return { session, user: user! } as const;
}

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if ("error" in gate) return gate.error;
  const form = await req.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "enter") {
    const organizationId = String(form.get("organizationId") ?? "");
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) return NextResponse.redirect(redirectTo(req, "/dashboard/admin?error=1"));
    await createSession({
      userId: gate.session.userId,
      organizationId: org.id,
      email: gate.session.email,
      sv: gate.session.sv,
    });
    return NextResponse.redirect(redirectTo(req, "/dashboard"));
  }

  const ticketId = String(form.get("ticketId") ?? "");
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { organization: true, user: true },
  });
  if (!ticket) return NextResponse.redirect(redirectTo(req, "/dashboard/admin?error=1"));

  if (intent === "resolve" || intent === "reopen") {
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { status: intent === "resolve" ? "resolved" : "open" },
    });
  }

  if (intent === "reply") {
    const body = String(form.get("body") ?? "").trim();
    if (body.length >= 2) {
      await db.supportReply.create({
        data: { ticketId: ticket.id, userId: gate.user.id, body: body.slice(0, 4000) },
      });
    }
  }

  return NextResponse.redirect(redirectTo(req, `/dashboard/admin/tickets/${ticket.id}`));
}
