import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessContext, canAccessProduct } from "@/lib/rbac";
import { OrgRole } from "@/generated/prisma/client";
import { removeTalkAttachment } from "@/lib/toolbox-attachments";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccessContext(session);
  if (!canAccessProduct(access, "toolbox-talks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.role === OrgRole.MEMBER) {
    return NextResponse.json(
      { error: "Only owners, admins and managers can delete talks." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const talk = await db.toolboxTalk.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!talk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.toolboxTalk.delete({ where: { id: talk.id } });
  if (talk.attachmentUrl) await removeTalkAttachment(talk.attachmentUrl);

  return NextResponse.json({ ok: true });
}
