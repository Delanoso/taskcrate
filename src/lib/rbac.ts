import { OrgRole } from "@/generated/prisma/client";
import { PRODUCTS } from "@/data/products";
import { expireUnpaidSubscriptions, formatRentDate } from "@/lib/billing";
import { db } from "@/lib/db";
import { sendAlertEmail } from "@/lib/mail";
import { remindCompanyIfDue } from "@/lib/trial-reminder";
import { isPlatformAdmin } from "@/lib/platform-admin";
import type { SessionPayload } from "@/lib/session";

export type AccessContext = {
  role: OrgRole;
  departmentId: string | null;
  productAccess: string[] | null;
  subscribedSlugs: string[];
  lapsedSlugs: string[];
  trialEndsAt: Date | null;
  trialActive: boolean;
};

export async function getAccessContext(
  session: SessionPayload,
): Promise<AccessContext> {
  const membership = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: session.organizationId,
      },
    },
  });

  const account = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true, platformAdmin: true },
  });
  if (isPlatformAdmin(account)) {
    return {
      role: OrgRole.OWNER,
      departmentId: null,
      productAccess: null,
      subscribedSlugs: PRODUCTS.map((p) => p.slug),
      lapsedSlugs: [],
      trialEndsAt: null,
      trialActive: false,
    };
  }

  if (!membership) throw new Error("FORBIDDEN");

  await expireUnpaidSubscriptions(session.organizationId);

  const org = await db.organization.findUnique({
    where: { id: session.organizationId },
    select: { name: true, trialEndsAt: true, trialNoticeSent: true, trialReminderSent: true },
  });
  const trialActive = !!(org?.trialEndsAt && org.trialEndsAt.getTime() > Date.now());
  if (org?.trialEndsAt && trialActive && !org.trialReminderSent) {
    void remindCompanyIfDue(session.organizationId).catch((err) => {
      console.error("Trial reminder failed", err);
    });
  }
  if (org?.trialEndsAt && !trialActive && !org.trialNoticeSent) {
    await db.organization.update({
      where: { id: session.organizationId },
      data: { trialNoticeSent: true },
    });
    await sendAlertEmail({
      subject: `[TaskCrate] Trial ended: ${org.name}`,
      text: `${org.name} finished the 7-day trial on ${formatRentDate(org.trialEndsAt)} and has not paid.`,
    });
  }

  const subs = await db.subscription.findMany({
    where: {
      organizationId: session.organizationId,
      status: "active",
      currentPeriodEnd: { gt: new Date() },
    },
    select: { productSlug: true },
  });
  const lapsed = await db.subscription.findMany({
    where: {
      organizationId: session.organizationId,
      status: { in: ["past_due", "canceled", "unpaid"] },
    },
    select: { productSlug: true },
  });

  let productAccess: string[] | null = null;
  if (membership.productAccess) {
    try {
      productAccess = JSON.parse(membership.productAccess) as string[];
    } catch {
      productAccess = null;
    }
  }

  return {
    role: membership.role,
    departmentId: membership.departmentId,
    productAccess,
    subscribedSlugs: trialActive ? PRODUCTS.map((product) => product.slug) : subs.map((s) => s.productSlug),
    lapsedSlugs: lapsed.map((s) => s.productSlug),
    trialEndsAt: org?.trialEndsAt ?? null,
    trialActive,
  };
}

export function isCompanyAdmin(role: OrgRole) {
  return role === OrgRole.OWNER || role === OrgRole.ADMIN;
}

export function canManageTeam(role: OrgRole) {
  return isCompanyAdmin(role);
}

export function canInviteUsers(role: OrgRole) {
  return isCompanyAdmin(role);
}

export function canAddApps(role: OrgRole) {
  return isCompanyAdmin(role);
}

export function canAccessProduct(
  ctx: AccessContext,
  productSlug: string,
): boolean {
  if (!ctx.subscribedSlugs.includes(productSlug)) return false;
  if (ctx.role === OrgRole.OWNER || ctx.role === OrgRole.ADMIN || ctx.role === OrgRole.MANAGER) {
    if (!ctx.productAccess) return true;
    return ctx.productAccess.includes(productSlug);
  }
  if (!ctx.productAccess) return false;
  return ctx.productAccess.includes(productSlug);
}

export function defaultProductAccessForRole(role: OrgRole): string[] | null {
  if (role === OrgRole.OWNER || role === OrgRole.ADMIN || role === OrgRole.MANAGER) {
    return null;
  }
  return [];
}
