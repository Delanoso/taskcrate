import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSession, getSession } from "@/lib/session";
import { redirectTo } from "@/lib/support";
import { appOrigin, emailCompanyAdmins, sendEmail } from "@/lib/email";

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

  if (intent === "extend_trial") {
    const org = await db.organization.findUnique({ where: { id: String(form.get("organizationId") ?? "") } });
    const days = Math.min(60, Math.max(1, Number(form.get("days")) || 7));
    if (!org) return NextResponse.redirect(redirectTo(req, "/dashboard/admin?error=1"));
    const from = org.trialEndsAt && org.trialEndsAt > new Date() ? org.trialEndsAt : new Date();
    const ends = new Date(from.getTime() + days * 864e5);
    await db.organization.update({
      where: { id: org.id },
      data: { trialEndsAt: ends, trialNote: null, trialReminderSent: false, trialFinalReminderSent: false, trialEndedEmailSent: false, trialNoticeSent: false, winbackStage: 0 },
    });
    await emailCompanyAdmins(org.id, {
      kind: "trial_extended",
      subject: `Your TaskCrate trial now runs until ${ends.toLocaleDateString("en-ZA", { day: "numeric", month: "long", timeZone: "Africa/Johannesburg" })}`,
      lines: [`We have opened every app for ${org.name} for another ${days} days, until ${ends.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" })}.`, "Pay for the apps you want to keep on the Billing page before then."],
      button: { label: "Open TaskCrate", url: `${appOrigin()}/dashboard` },
    });
    return NextResponse.redirect(redirectTo(req, "/dashboard/admin"));
  }

  const ticketId = String(form.get("ticketId") ?? "");
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { organization: true, user: true },
  });
  if (!ticket) return NextResponse.redirect(redirectTo(req, "/dashboard/admin?error=1"));

  const ticketUrl = `${appOrigin()}/dashboard/support/${ticket.id}`;
  const first = ticket.user.fullName.split(" ")[0];

  if (intent === "resolve" || intent === "reopen") {
    await db.supportTicket.update({
      where: { id: ticket.id },
      data: { status: intent === "resolve" ? "resolved" : "open" },
    });
    if (intent === "resolve") {
      await sendEmail({
        to: ticket.user.email,
        organizationId: ticket.organizationId,
        kind: "ticket_resolved",
        subject: `Resolved: ${ticket.subject}`,
        greeting: `Hi ${first},`,
        lines: [`We have marked your support ticket "${ticket.subject}" as resolved.`, "If something is still not right, reply on the ticket and it opens again."],
        button: { label: "Open the ticket", url: ticketUrl },
      });
    }
  }

  if (intent === "reply") {
    const body = String(form.get("body") ?? "").trim();
    if (body.length >= 2) {
      await db.supportReply.create({
        data: { ticketId: ticket.id, userId: gate.user.id, body: body.slice(0, 4000) },
      });
      const resolve = form.get("resolve") === "1";
      if (resolve || ticket.status !== "open") {
        await db.supportTicket.update({ where: { id: ticket.id }, data: { status: resolve ? "resolved" : "open" } });
      }
      const sent = await sendEmail({
        to: ticket.user.email,
        organizationId: ticket.organizationId,
        kind: "ticket_reply",
        subject: `Re: ${ticket.subject}`,
        greeting: `Hi ${first},`,
        lines: ["TaskCrate support replied to your ticket:", `> ${body.slice(0, 4000)}`, resolve ? "We have marked the ticket as resolved. Reply on the ticket if you need anything else." : "Reply on the ticket in your dashboard to answer."],
        button: { label: "Open the ticket", url: ticketUrl },
      });
      await db.supportTicket.update({ where: { id: ticket.id }, data: { mailError: sent.ok ? null : `Reply email failed: ${sent.error}` } });
    }
  }

  return NextResponse.redirect(redirectTo(req, `/dashboard/admin/tickets/${ticket.id}`));
}
