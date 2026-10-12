import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { canManageTeam, defaultProductAccessForRole } from "@/lib/rbac";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const actor = await db.membership.findUniqueOrThrow({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: session.organizationId,
      },
    },
  });

  if (!canManageTeam(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = inviteSchema.parse(await req.json());
  if (body.role === OrgRole.OWNER && actor.role !== OrgRole.OWNER) {
    return NextResponse.json({ error: "Only owners can assign owner role" }, { status: 403 });
  }

  const tempPassword = crypto.randomUUID().slice(0, 12);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const productAccess =
    body.productSlugs !== undefined
      ? JSON.stringify(body.productSlugs)
      : defaultProductAccessForRole(body.role) === null
        ? null
        : JSON.stringify(defaultProductAccessForRole(body.role));

  const user = await db.user.upsert({
    where: { email: body.email.toLowerCase() },
    create: {
      email: body.email.toLowerCase(),
      fullName: body.fullName,
      passwordHash,
      termsAcceptances: { create: { version: "2026-10-12-v1" } },
    },
    update: {},
  });

  await db.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: session.organizationId,
      },
    },
    create: {
      userId: user.id,
      organizationId: session.organizationId,
      role: body.role,
      departmentId: body.departmentId,
      productAccess,
    },
    update: {
      role: body.role,
      departmentId: body.departmentId,
      productAccess,
    },
  });

  return NextResponse.json({
    ok: true,
    temporaryPassword: tempPassword,
    message:
      "In production, send a secure invite email instead of returning a password. This demo returns a one-time password for local testing.",
  });
}
