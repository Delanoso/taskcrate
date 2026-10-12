import { NextResponse } from "next/server";
import { getAccessContext, canAccessProduct } from "@/lib/rbac";
import { getSession } from "@/lib/session";

export async function requireProductApi(productSlug: string) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const access = await getAccessContext(session);
  if (!canAccessProduct(access, productSlug)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session, access } as const;
}
