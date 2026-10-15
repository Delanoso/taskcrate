import bcrypt from "bcryptjs";
import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendAlertEmail } from "@/lib/mail";
import { companyKey, phoneKey, trialEndsAt } from "@/lib/pricing";
import { formatRentDate } from "@/lib/billing";
import { createSession, getSession, type SessionPayload } from "@/lib/session";

export const TERMS_VERSION = "2026-10-12-v1";
export const IP_NOTICE_VERSION = "2026-10-12-v1";

export async function registerOrganization(input: {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  phone: string;
  acceptedTerms: boolean;
}) {
  if (!input.acceptedTerms) {
    throw new Error("You must accept the Terms & Conditions to register.");
  }

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("An account with this email already exists.");

  const normalizedPhone = phoneKey(input.phone);
  if (!normalizedPhone) throw new Error("Enter a valid cellphone number, for example 082 123 4567.");
  const normalizedCompany = companyKey(input.companyName);
  if (!normalizedCompany) throw new Error("Enter the company's real name.");

  const slug = slugify(input.companyName);
  const slugTaken = await db.organization.findUnique({ where: { slug } });
  if (slugTaken) throw new Error("Company name is too common — try a more specific name.");

  const prior = await db.trialClaim.findFirst({
    where: {
      OR: [
        { kind: "phone", value: normalizedPhone },
        { kind: "company", value: normalizedCompany },
      ],
    },
  });
  const ends = trialEndsAt();
  const trialNote = prior
    ? prior.kind === "phone"
      ? "No second trial: this cellphone number was already used."
      : "No second trial: this company name was already used."
    : null;

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      passwordHash,
      termsAcceptances: { create: { version: TERMS_VERSION } },
      memberships: {
        create: {
          role: OrgRole.ADMIN,
          organization: {
            create: {
              name: input.companyName,
              slug,
              phone: input.phone.trim(),
              phoneKey: normalizedPhone,
              companyKey: normalizedCompany,
              trialEndsAt: prior ? null : ends,
              trialNote,
              branding: { create: { displayName: input.companyName } },
            },
          },
        },
      },
    },
    include: { memberships: { include: { organization: true } } },
  });

  const org = user.memberships[0]!.organization;
  let trial = !prior;
  if (trial) {
    try {
      await db.$transaction([
        db.trialClaim.create({
          data: { kind: "phone", value: normalizedPhone, organizationId: org.id },
        }),
        db.trialClaim.create({
          data: { kind: "company", value: normalizedCompany, organizationId: org.id },
        }),
      ]);
    } catch {
      trial = false;
      await db.organization.update({
        where: { id: org.id },
        data: {
          trialEndsAt: null,
          trialNote: "No second trial: this company or cellphone number was already used.",
        },
      });
    }
  }

  await createSession({
    userId: user.id,
    organizationId: org.id,
    email: user.email,
    sv: user.sessionVersion,
  });
  await sendAlertEmail({
    subject: `[TaskCrate] New company: ${input.companyName}`,
    text: [
      `Company: ${input.companyName}`,
      `Contact: ${input.fullName}`,
      `Email: ${user.email}`,
      `Phone: ${input.phone.trim()}`,
      trial ? `Trial until ${formatRentDate(ends)}` : trialNote ?? "No trial",
    ].join("\n"),
  });

  return { user, organization: org, trial };
}

export async function authenticateUser(input: { email: string; password: string }) {
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      memberships: { include: { organization: true }, orderBy: { createdAt: "asc" } },
      termsAcceptances: { where: { version: TERMS_VERSION } },
    },
  });

  if (!user) throw new Error("Invalid email or password.");
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password.");
  if (user.termsAcceptances.length === 0) {
    throw new Error("Terms acceptance required. Please contact support.");
  }

  const membership = user.memberships[0];
  if (!membership) throw new Error("No organization linked to this account.");

  return {
    user,
    organization: membership.organization,
    session: {
      userId: user.id,
      organizationId: membership.organizationId,
      email: user.email,
      sv: user.sessionVersion,
    } satisfies SessionPayload,
  };
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string) {
  if (nextPassword.length < 8) throw new Error("Password must be at least 8 characters.");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Account not found.");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is wrong.");
  const same = await bcrypt.compare(nextPassword, user.passwordHash);
  if (same) throw new Error("Choose a different password.");

  const passwordHash = await bcrypt.hash(nextPassword, 12);
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustSetPassword: false,
      sessionVersion: { increment: 1 },
    },
  });
  await db.passwordReset.deleteMany({ where: { userId } });
  return updated;
}

export async function login(input: { email: string; password: string }) {
  const result = await authenticateUser(input);
  await createSession(result.session);
  return { user: result.user, organization: result.organization };
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
