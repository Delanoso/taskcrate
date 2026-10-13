import { redirect } from "next/navigation";
import { IP_NOTICE_VERSION } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessContext, canAccessProduct } from "@/lib/rbac";
import { getSession } from "@/lib/session";

export async function requireDashboardContext() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [org, user, access] = await Promise.all([
    db.organization.findUnique({
      where: { id: session.organizationId },
      include: { branding: true },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
    getAccessContext(session).catch(() => null),
  ]);
  // Valid token but the user, company or membership is gone (removed from the team, account deleted).
  if (!org || !user || !access) redirect("/login");

  return { session, org, user, access };
}

export async function requireProductAccess(productSlug: string) {
  const ctx = await requireDashboardContext();
  if (!canAccessProduct(ctx.access, productSlug)) {
    redirect("/dashboard?upgrade=1");
  }
  return ctx;
}

export async function needsIpNotice(userId: string, productSlug: string) {
  const ack = await db.ipNoticeAcknowledgement.findUnique({
    where: {
      userId_productSlug_version: {
        userId,
        productSlug,
        version: IP_NOTICE_VERSION,
      },
    },
  });
  return !ack;
}
