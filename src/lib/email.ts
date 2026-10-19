import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendCustomerEmail } from "@/lib/mail";

export const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL || "https://taskcrate.co.za").replace(/\/$/, "");

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type EmailContent = {
  /** First line, e.g. "Hi Sipho," */
  greeting?: string;
  /** Paragraphs; a line starting with "> " is shown as a quote */
  lines: string[];
  button?: { label: string; url: string };
  /** Small print under the button */
  after?: string[];
};

/** Plain-text and HTML versions of one TaskCrate email in the house style. */
export function renderEmail(c: EmailContent) {
  const text = [
    ...(c.greeting ? [c.greeting, ""] : []),
    ...c.lines.flatMap((l) => [l.startsWith("> ") ? l.slice(2) : l, ""]),
    ...(c.button ? [`${c.button.label}: ${c.button.url}`, ""] : []),
    ...(c.after ?? []).flatMap((l) => [l, ""]),
    "TaskCrate",
    appOrigin(),
  ].join("\n");
  const para = (l: string) =>
    l.startsWith("> ")
      ? `<p style="margin:0 0 14px;padding:10px 14px;border-left:3px solid #c9d3e0;background:#f5f7fa;color:#24303d;white-space:pre-wrap">${esc(l.slice(2))}</p>`
      : `<p style="margin:0 0 14px">${esc(l)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f2f4f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2933;font-size:15px;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#1e3a5f;padding:16px 24px;color:#ffffff;font-weight:600;font-size:17px">TaskCrate</td></tr>
<tr><td style="padding:24px">
${c.greeting ? `<p style="margin:0 0 14px">${esc(c.greeting)}</p>` : ""}
${c.lines.map(para).join("\n")}
${c.button ? `<p style="margin:20px 0"><a href="${esc(c.button.url)}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">${esc(c.button.label)}</a></p><p style="margin:0 0 14px;color:#6b7785;font-size:13px">Or copy this link: ${esc(c.button.url)}</p>` : ""}
${(c.after ?? []).map((l) => `<p style="margin:0 0 10px;color:#6b7785;font-size:13px">${esc(l)}</p>`).join("\n")}
</td></tr>
<tr><td style="padding:14px 24px;background:#f7f9fb;color:#8a95a3;font-size:12px">TaskCrate by Delano Solutions · <a href="${appOrigin()}" style="color:#8a95a3">${appOrigin().replace(/^https?:\/\//, "")}</a> · Questions? Open a ticket under Support in your dashboard.</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

/** Sends one customer email and records the result in EmailLog. */
export async function sendEmail(input: { to: string; subject: string; kind: string; organizationId?: string | null } & EmailContent) {
  const { text, html } = renderEmail(input);
  const result = await sendCustomerEmail({ to: input.to, subject: input.subject, text, html }).catch((e) => ({ ok: false as const, error: e instanceof Error ? e.message : "send failed" }));
  await db.emailLog
    .create({
      data: {
        organizationId: input.organizationId ?? null,
        to: input.to,
        subject: input.subject.slice(0, 200),
        kind: input.kind,
        status: result.ok ? "sent" : "failed",
        error: result.ok ? null : result.error.slice(0, 500),
      },
    })
    .catch(() => undefined);
  return result;
}

/** Owners and admins of a company (not the platform owner when he is visiting). */
export async function companyAdmins(organizationId: string) {
  const rows = await db.membership.findMany({
    where: { organizationId, role: { in: [OrgRole.OWNER, OrgRole.ADMIN] }, user: { platformAdmin: false } },
    select: { user: { select: { email: true, fullName: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => r.user);
}

/** In-app alert plus an email to every owner and admin. The email is how the company hears about it without logging in. */
export async function alertCompany(organizationId: string, input: { productSlug: string; title: string; body: string; kind: string; subject: string; lines: string[] }) {
  await db.notification.create({
    data: { organizationId, productSlug: input.productSlug, title: input.title, body: input.body.slice(0, 500) },
  }).catch(() => undefined);
  return emailCompanyAdmins(organizationId, {
    kind: input.kind,
    subject: input.subject,
    lines: input.lines,
    button: { label: "Open TaskCrate", url: `${appOrigin()}/dashboard` },
  });
}

/** Same email to every owner/admin, each greeted by first name. Returns how many were sent. */
export async function emailCompanyAdmins(organizationId: string, input: { subject: string; kind: string } & Omit<EmailContent, "greeting">) {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { slug: true } });
  if (org?.slug === "taskcrate-demo") return 0;
  let sent = 0;
  for (const admin of await companyAdmins(organizationId)) {
    const r = await sendEmail({ ...input, organizationId, to: admin.email, greeting: `Hi ${admin.fullName.split(" ")[0]},` });
    if (r.ok) sent++;
  }
  return sent;
}
