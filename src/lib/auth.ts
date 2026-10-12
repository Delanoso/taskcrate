import bcrypt from "bcryptjs";
import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createSession, getSession, type SessionPayload } from "@/lib/session";

export const TERMS_VERSION = "2026-10-12-v1";
export const IP_NOTICE_VERSION = "2026-10-12-v1";

export async function registerOrganization(input: {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  acceptedTerms: boolean;
}) {
  if (!input.acceptedTerms) {
    throw new Error("You must accept the Terms & Conditions to register.");
  }

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("An account with this email already exists.");

  const slug = slugify(input.companyName);
  const slugTaken = await db.organization.findUnique({ where: { slug } });
  if (slugTaken) throw new Error("Company name is too common — try a more specific name.");

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      passwordHash,
      termsAcceptances: {
        create: { version: TERMS_VERSION },
      },
      memberships: {
        create: {
          role: OrgRole.OWNER,
          organization: {
            create: {
              name: input.companyName,
              slug,
              branding: {
                create: {
                  displayName: input.companyName,
                },
              },
            },
          },
        },
      },
    },
    include: {
      memberships: { include: { organization: true } },
    },
  });

  const org = user.memberships[0]!.organization;
  await createSession({
    userId: user.id,
    organizationId: org.id,
    email: user.email,
  });

  return { user, organization: org };
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
    } satisfies SessionPayload,
  };
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
