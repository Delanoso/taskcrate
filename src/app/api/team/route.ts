import { NextResponse } from "next/server";
import { z } from "zod";
import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { publicOrigin } from "@/lib/public-origin";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { canInviteUsers, isCompanyAdmin } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { inviteTeamMember } from "@/lib/team-invite";

async function requirePeopleAdmin(session: { userId: string; organizationId: string }) {
  const account = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true, platformAdmin: true },
  });
  if (isPlatformAdmin(account)) return { ok: true as const };

  const actor = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: session.organizationId,
      },
    },
  });
  if (!actor || !canInviteUsers(actor.role)) return { ok: false as const };
  return { ok: true as const };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requirePeopleAdmin(session)).ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db.membership.findMany({
    where: { organizationId: session.organizationId },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      department: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.nativeEnum(OrgRole),
  departmentId: z.string().optional(),
  productSlugs: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await requirePeopleAdmin(session)).ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = inviteSchema.parse(await req.json());
  if (body.role !== OrgRole.ADMIN && body.role !== OrgRole.MEMBER) {
    return NextResponse.json({ error: "Choose Admin, or choose the apps they can open." }, { status: 400 });
  }

  const [org, inviter] = await Promise.all([
    db.organization.findUnique({
      where: { id: session.organizationId },
      include: { branding: true },
    }),
    db.user.findUnique({ where: { id: session.userId }, select: { fullName: true } }),
  ]);
  if (!org || !inviter) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const productAccess =
    body.role === OrgRole.ADMIN
      ? null
      : JSON.stringify(body.productSlugs ?? []);

  const result = await inviteTeamMember({
    organizationId: session.organizationId,
    organizationName: org.branding?.displayName || org.name,
    inviterName: inviter.fullName,
    email: body.email,
    fullName: body.fullName,
    role: body.role,
    departmentId: body.departmentId,
    productAccess,
    origin: publicOrigin(req),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({
    ok: true,
    kind: result.kind,
    devLink:
      process.env.NODE_ENV === "development" && result.kind === "invited" ? result.devLink : undefined,
  });
}

const accessSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum([OrgRole.ADMIN, OrgRole.MEMBER]),
  productSlugs: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await requirePeopleAdmin(session)).ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = accessSchema.parse(await req.json());
  const membership = await db.membership.findFirst({
    where: { id: body.membershipId, organizationId: session.organizationId },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (membership.userId === session.userId && body.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "You cannot remove your own admin access." }, { status: 400 });
  }
  if (body.role === OrgRole.MEMBER && isCompanyAdmin(membership.role)) {
    const admins = await db.membership.count({
      where: {
        organizationId: session.organizationId,
        role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
      },
    });
    if (admins <= 1) {
      return NextResponse.json({ error: "The company needs at least one admin." }, { status: 400 });
    }
  }

  await db.membership.update({
    where: { id: membership.id },
    data: {
      role: body.role === OrgRole.ADMIN && membership.role === OrgRole.OWNER ? OrgRole.OWNER : body.role,
      productAccess: body.role === OrgRole.ADMIN ? null : JSON.stringify(body.productSlugs ?? []),
    },
  });

  return NextResponse.json({ ok: true });
}
