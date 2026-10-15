import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendAlertEmail, sendCustomerEmail } from "@/lib/mail";
import { sendPasswordSetupLink } from "@/lib/password-reset";

export async function inviteTeamMember(input: {
  organizationId: string;
  organizationName: string;
  inviterName: string;
  email: string;
  fullName: string;
  role: OrgRole;
  departmentId?: string;
  productAccess: string | null;
  origin: string;
}) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const existing = await db.user.findUnique({ where: { email } });

  const already = existing
    ? await db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: existing.id,
            organizationId: input.organizationId,
          },
        },
      })
    : null;

  const user =
    existing ??
    (await db.user.create({
      data: {
        email,
        fullName,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), 12),
        mustSetPassword: true,
      },
    }));

  await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: input.organizationId,
      },
    },
    create: {
      userId: user.id,
      organizationId: input.organizationId,
      role: input.role,
      departmentId: input.departmentId,
      productAccess: input.productAccess,
    },
    update: {
      role: input.role,
      departmentId: input.departmentId,
      productAccess: input.productAccess,
    },
  });

  if (user.mustSetPassword) {
    const sent = await sendPasswordSetupLink({
      userId: user.id,
      email,
      origin: input.origin,
      companyName: input.organizationName,
      inviterName: input.inviterName,
    });
    if (!sent.ok) return { ok: false as const, error: "Could not email the invite. Try again in a minute." };
    return { ok: true as const, kind: "invited" as const, devLink: sent.devLink };
  }

  if (already) {
    return { ok: true as const, kind: "updated" as const };
  }

  const sent = await sendCustomerEmail({
    to: email,
    subject: `You have access to ${input.organizationName} on TaskCrate`,
    text: [
      `${input.inviterName} added you to ${input.organizationName} on TaskCrate.`,
      "",
      "Sign in with your existing password:",
      "",
      `${input.origin}/login`,
    ].join("\n"),
  });

  if (!sent.ok) {
    if (process.env.NODE_ENV === "development") return { ok: true as const, kind: "added" as const };
    await sendAlertEmail({
      subject: "[TaskCrate] Staff invite email failed",
      text: `Added ${email} to ${input.organizationName}, but the notice email failed. ${sent.error ?? ""}`.trim(),
    });
    return {
      ok: false as const,
      error: "They are on the team, but the email did not send. Try again.",
    };
  }

  return { ok: true as const, kind: "added" as const };
}
