import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { OrgRole } from "@/generated/prisma/client";
import { TERMS_VERSION } from "@/lib/auth";
import { slugify } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function provisionWorkspaceFromPayment(input: {
  email: string;
  fullName: string;
  companyName: string;
  productSlug: string;
  paymentRef?: string;
  provider?: string;
  autoLogin?: boolean;
}) {
  const email = input.email.toLowerCase().trim();
  let user = await db.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: true }, orderBy: { createdAt: "asc" } } },
  });

  let temporaryPassword: string | undefined;
  let organizationId: string;

  if (!user) {
    temporaryPassword = randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    let slug = slugify(input.companyName);
    const taken = await db.organization.findUnique({ where: { slug } });
    if (taken) slug = `${slug}-${randomBytes(2).toString("hex")}`;

    user = await db.user.create({
      data: {
        email,
        fullName: input.fullName,
        passwordHash,
        termsAcceptances: { create: { version: TERMS_VERSION } },
        memberships: {
          create: {
            role: OrgRole.OWNER,
            organization: {
              create: {
                name: input.companyName,
                slug,
                branding: { create: { displayName: input.companyName } },
              },
            },
          },
        },
      },
      include: {
        memberships: { include: { organization: true }, orderBy: { createdAt: "asc" } },
      },
    });
    organizationId = user.memberships[0]!.organizationId;
  } else {
    const membership = user.memberships[0];
    if (!membership) throw new Error("User has no organization");
    organizationId = membership.organizationId;
    const hasTerms = await db.termsAcceptance.findFirst({
      where: { userId: user.id, version: TERMS_VERSION },
    });
    if (!hasTerms) {
      await db.termsAcceptance.create({
        data: { userId: user.id, version: TERMS_VERSION },
      });
    }
  }

  await db.subscription.upsert({
    where: {
      organizationId_productSlug: {
        organizationId,
        productSlug: input.productSlug,
      },
    },
    create: {
      organizationId,
      productSlug: input.productSlug,
      status: "active",
      stripeSubscriptionId: input.paymentRef,
    },
    update: {
      status: "active",
      stripeSubscriptionId: input.paymentRef ?? undefined,
    },
  });

  if (input.autoLogin) {
    await createSession({
      userId: user.id,
      organizationId,
      email: user.email,
    });
  }

  return {
    userId: user.id,
    organizationId,
    email: user.email,
    temporaryPassword,
  };
}
