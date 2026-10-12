import { NextResponse } from "next/server";
import { z } from "zod";
import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/rbac";
import { getSession } from "@/lib/session";

const schema = z.object({
  displayName: z.string().min(2),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await db.membership.findUniqueOrThrow({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: session.organizationId,
      },
    },
  });

  if (!canManageTeam(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  await db.organizationBranding.update({
    where: { organizationId: session.organizationId },
    data: {
      displayName: body.displayName,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      logoUrl: body.logoUrl || null,
    },
  });

  return NextResponse.json({ ok: true });
}
