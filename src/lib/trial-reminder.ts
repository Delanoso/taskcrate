import { OrgRole } from "@/generated/prisma/client";
import { formatRentDate } from "@/lib/billing";
import { db } from "@/lib/db";
import { customerMailReady, mailConfigured, sendAlertEmail, sendCustomerEmail } from "@/lib/mail";
import { trialReminderDay } from "@/lib/trial-window";

const globalForReminder = globalThis as unknown as { trialReminderStarted?: boolean };

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://taskcrate.co.za").replace(/\/$/, "");
}

function paymentUrl() {
  return `${appOrigin()}/login?next=/dashboard/billing`;
}

function reminderMessage(input: {
  fullName: string;
  companyName: string;
  endsAt: Date;
  days: number;
}) {
  const when = formatRentDate(input.endsAt);
  const left = input.days === 1 ? "One day is left." : "Two days are left.";
  const subject =
    input.days === 1
      ? "Your TaskCrate free trial ends tomorrow"
      : "Your TaskCrate free trial ends in two days";
  const url = paymentUrl();
  const text = [
    `Hi ${input.fullName},`,
    "",
    `The free trial for ${input.companyName} ends on ${when}. ${left}`,
    "",
    "After that, each app stays closed until its monthly rent is paid. Each app is R1 000 per month. The first payment covers the days left in this month.",
    "",
    "Open this link to sign in and pay for the apps you want to keep:",
    "",
    url,
    "",
    "TaskCrate",
    appOrigin(),
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(input.fullName)},</p>
<p>The free trial for ${escapeHtml(input.companyName)} ends on ${escapeHtml(when)}. ${escapeHtml(left)}</p>
<p>After that, each app stays closed until its monthly rent is paid. Each app is R1 000 per month. The first payment covers the days left in this month.</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Pay for the apps you want to keep</a></p>
<p style="color:#526070;font-size:14px;">Or copy this link: ${escapeHtml(url)}</p>
<p>TaskCrate<br><a href="${escapeHtml(appOrigin())}">${escapeHtml(appOrigin())}</a></p>`;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function remindCompany(organizationId: string, now = new Date()) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, trialEndsAt: true, trialReminderSent: true },
  });
  if (!org?.trialEndsAt || org.trialReminderSent) return { sent: 0, failed: 0 };
  const days = trialReminderDay(org.trialEndsAt, now);
  if (!days) return { sent: 0, failed: 0 };
  if (!mailConfigured() || !customerMailReady()) return { sent: 0, failed: 0 };

  const claimed = await db.organization.updateMany({
    where: { id: org.id, trialReminderSent: false },
    data: { trialReminderSent: true },
  });
  if (claimed.count !== 1) return { sent: 0, failed: 0 };

  const admins = await db.membership.findMany({
    where: {
      organizationId: org.id,
      role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
      user: { platformAdmin: false },
    },
    select: { user: { select: { email: true, fullName: true } } },
  });
  if (admins.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  const failed: string[] = [];
  for (const admin of admins) {
    const message = reminderMessage({
      fullName: admin.user.fullName,
      companyName: org.name,
      endsAt: org.trialEndsAt,
      days,
    });
    const result = await sendCustomerEmail({
      to: admin.user.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (result.ok) sent += 1;
    else failed.push(`${admin.user.email} (${result.error ?? "mail failed"})`);
  }

  if (sent === 0) {
    await db.organization.update({
      where: { id: org.id },
      data: { trialReminderSent: false },
    });
    if (failed.length > 0) {
      await sendAlertEmail({
        subject: `[TaskCrate] Trial reminder failed: ${org.name}`,
        text: failed.join("\n"),
      });
    }
    return { sent: 0, failed: failed.length };
  }

  if (failed.length > 0) {
    await sendAlertEmail({
      subject: `[TaskCrate] Trial reminder partly failed: ${org.name}`,
      text: `Sent ${sent}. Failed:\n${failed.join("\n")}`,
    });
  }
  return { sent, failed: failed.length };
}

export async function remindCompanyIfDue(organizationId: string, now = new Date()) {
  return remindCompany(organizationId, now);
}

export async function sendDueTrialReminders(now = new Date()) {
  const orgs = await db.organization.findMany({
    where: { trialReminderSent: false, trialEndsAt: { gt: now } },
    select: { id: true },
  });
  let sent = 0;
  let failed = 0;
  for (const org of orgs) {
    const result = await remindCompany(org.id, now);
    sent += result.sent;
    failed += result.failed;
  }
  if (sent > 0 || failed > 0) {
    console.log(`Trial reminders sent ${sent}, failed ${failed}`);
  }
  return { sent, failed };
}

export function startTrialReminderSchedule() {
  if (globalForReminder.trialReminderStarted) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  globalForReminder.trialReminderStarted = true;
  console.log("Trial reminder check is running");
  const tick = () => {
    void sendDueTrialReminders().catch((err) => {
      console.error("Trial reminder check failed", err);
    });
  };
  setTimeout(tick, 30_000);
  setInterval(tick, 60 * 60 * 1000);
}
