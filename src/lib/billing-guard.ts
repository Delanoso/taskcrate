import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { canAddApps, getAccessContext } from "@/lib/rbac";
import { getSession } from "@/lib/session";

/** Company owners/admins (and the platform owner) manage billing. */
export async function requireBillingApi() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const access = await getAccessContext(session).catch(() => null);
  if (!access) return { error: NextResponse.json({ error: "Your session has ended. Please sign in again." }, { status: 401 }) } as const;
  if (!canAddApps(access.role)) return { error: NextResponse.json({ error: "Only company admins can manage billing." }, { status: 403 }) } as const;
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { fullName: true, email: true, platformAdmin: true } });
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  return { session, access, user, platformAdmin: isPlatformAdmin(user) } as const;
}
