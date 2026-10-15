import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { TERMS_VERSION } from "@/lib/auth";
import { db } from "@/lib/db";
import { mailConfigured, sendAlertEmail, sendCustomerEmail } from "@/lib/mail";

const RESET_TTL_MS = 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string, origin: string) {
  const normalized = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user) return {};

  const recent = await db.passwordReset.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
  });
  if (recent) return {};

  const token = randomBytes(32).toString("base64url");
  const url = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

  await db.passwordReset.deleteMany({ where: { userId: user.id } });
  await db.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  if (!mailConfigured()) {
    return process.env.NODE_ENV === "development" ? { devLink: url } : {};
  }

  const sent = await sendCustomerEmail({
    to: user.email,
    subject: "Reset your TaskCrate password",
    text: [
      `Someone asked to reset the password for ${user.email}.`,
      "",
      "Open this link to choose a new password. It works for one hour and can be used once:",
      "",
      url,
      "",
      "If you did not ask for this, ignore this email. Your password stays the same.",
    ].join("\n"),
  });

  if (!sent.ok) {
    await db.passwordReset.deleteMany({ where: { userId: user.id, tokenHash: hashToken(token) } });
    await sendAlertEmail({
      subject: "[TaskCrate] Password reset email failed",
      text: `Could not email a reset link to ${user.email}. ${sent.error ?? ""}`.trim(),
    });
  }
  return {};
}

export async function resetPassword(token: string, password: string) {
  const trimmed = token.trim();
  if (!trimmed) throw new Error("This reset link is missing. Request a new one.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const row = await db.passwordReset.findUnique({
    where: { tokenHash: hashToken(trimmed) },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    if (row) await db.passwordReset.delete({ where: { id: row.id } }).catch(() => undefined);
    throw new Error("This reset link has expired. Request a new one.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({
      where: { id: row.userId },
      data: {
        passwordHash,
        mustSetPassword: false,
        sessionVersion: { increment: 1 },
      },
    }),
    db.passwordReset.deleteMany({ where: { userId: row.userId } }),
  ]);

  const accepted = await db.termsAcceptance.findFirst({
    where: { userId: row.userId, version: TERMS_VERSION },
  });
  if (!accepted) {
    await db.termsAcceptance.create({
      data: { userId: row.userId, version: TERMS_VERSION },
    });
  }
}

export async function sendPasswordSetupLink(input: {
  userId: string;
  email: string;
  origin: string;
  companyName: string;
  inviterName: string;
}) {
  const recent = await db.passwordReset.findFirst({
    where: {
      userId: input.userId,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
  });
  if (recent) return { ok: true as const };

  const token = randomBytes(32).toString("base64url");
  const url = `${input.origin}/reset-password?token=${encodeURIComponent(token)}`;

  await db.passwordReset.deleteMany({ where: { userId: input.userId } });
  await db.passwordReset.create({
    data: {
      userId: input.userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const customerReady = Boolean(process.env.SMTP_CUSTOMER_USER && process.env.SMTP_CUSTOMER_PASS);
  if (!customerReady || !mailConfigured()) {
    if (process.env.NODE_ENV === "development") return { ok: true as const, devLink: url };
    await db.passwordReset.deleteMany({ where: { userId: input.userId, tokenHash: hashToken(token) } });
    return { ok: false as const, error: "The hello@taskcrate.co.za mailbox is not ready." };
  }

  const sent = await sendCustomerEmail({
    to: input.email,
    subject: `Set your password for ${input.companyName} on TaskCrate`,
    text: [
      `${input.inviterName} added you to ${input.companyName} on TaskCrate.`,
      "",
      "Open this link to choose your password. It works for 7 days and can be used once:",
      "",
      url,
      "",
      "After that, sign in at " + `${input.origin}/login`,
    ].join("\n"),
  });

  if (!sent.ok) {
    await db.passwordReset.deleteMany({ where: { userId: input.userId, tokenHash: hashToken(token) } });
    await sendAlertEmail({
      subject: "[TaskCrate] Staff invite email failed",
      text: `Could not email a password link to ${input.email} for ${input.companyName}. ${sent.error ?? ""}`.trim(),
    });
    return { ok: false as const, error: sent.error ?? "Could not send the invite email." };
  }

  return { ok: true as const };
}
