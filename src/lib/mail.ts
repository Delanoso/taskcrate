import nodemailer from "nodemailer";
import { alertEmail } from "@/lib/platform-admin";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Mail customers see. Password resets use this address. */
export function customerFrom() {
  return process.env.SMTP_CUSTOMER_FROM || "TaskCrate <hello@taskcrate.co.za>";
}

/** Mail only the operator sees, such as tickets and problem alerts. */
function staffFrom() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "erich@delanosolutions.co.za";
}

function customerMailboxReady() {
  return Boolean(process.env.SMTP_CUSTOMER_USER && process.env.SMTP_CUSTOMER_PASS);
}

async function deliver(input: {
  to: string;
  subject: string;
  text: string;
  from: string;
  host: string;
  port: number;
  auth: { user: string | undefined; pass: string | undefined };
}) {
  const transporter = nodemailer.createTransport({
    host: input.host,
    port: input.port,
    secure: input.port === 465,
    auth: {
      user: input.auth.user,
      pass: input.auth.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mail could not be sent.";
    return { ok: false as const, error: message };
  }
}

export async function sendCustomerEmail(input: { to: string; subject: string; text: string }) {
  if (!mailConfigured() || !customerMailboxReady()) {
    return {
      ok: false as const,
      error: "The hello@taskcrate.co.za mailbox login is not on the server yet.",
    };
  }
  return deliver({
    to: input.to,
    subject: input.subject,
    text: input.text,
    from: customerFrom(),
    host: process.env.SMTP_CUSTOMER_HOST || "smtp.hmailplus.com",
    port: Number(process.env.SMTP_CUSTOMER_PORT || 587),
    auth: { user: process.env.SMTP_CUSTOMER_USER, pass: process.env.SMTP_CUSTOMER_PASS },
  });
}

export async function sendAlertEmail(input: { subject: string; text: string }) {
  const to = alertEmail();
  if (!mailConfigured()) {
    return {
      ok: false as const,
      error: `Saved in the control room. Email to ${to} is waiting for the mailbox login on the server.`,
    };
  }
  return deliver({
    to,
    subject: input.subject,
    text: input.text,
    from: staffFrom(),
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
