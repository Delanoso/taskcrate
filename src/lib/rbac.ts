import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { SessionPayload } from "@/lib/session";

export type AccessContext = {
  role: OrgRole;
  departmentId: string | null;
  productAccess: string[] | null;
  subscribedSlugs: string[];
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

  if (!membership) throw new Error("FORBIDDEN");

  const subs = await db.subscription.findMany({
    where: {
      organizationId: session.organizationId,
      status: "active",
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
    subscribedSlugs: subs.map((s) => s.productSlug),
  };
}

export function canManageTeam(role: OrgRole) {
  return role === OrgRole.OWNER || role === OrgRole.ADMIN;
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
