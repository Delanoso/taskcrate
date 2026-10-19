import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listPeople, savePerson } from "@/lib/modules/people";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getAccessContext, isCompanyAdmin } from "@/lib/rbac";
import { getSession } from "@/lib/session";

async function gate() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const access = await getAccessContext(session);
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { email: true, platformAdmin: true } });
  const manage = isPlatformAdmin(user) || isCompanyAdmin(access.role);
  return { session, manage } as const;
}

export async function GET() {
  const g = await gate();
  if ("error" in g) return g.error;
  return NextResponse.json({ people: await listPeople(g.session.organizationId), canManage: g.manage });
}

export async function POST(req: Request) {
  const g = await gate();
  if ("error" in g) return g.error;
  if (!g.manage) return NextResponse.json({ error: "Only an admin can change the staff list." }, { status: 403 });
  try {
    const person = await savePerson(g.session.organizationId, await req.json().catch(() => null));
    return NextResponse.json({ person });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save" }, { status: 400 });
  }
}
