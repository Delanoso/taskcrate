import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessContext, canAccessProduct } from "@/lib/rbac";
import { createToolboxRegisterPdf } from "@/lib/pdf/toolbox-register";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccessContext(session);
  if (!canAccessProduct(access, "toolbox-talks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const talk = await db.toolboxTalk.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!talk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { bytes, documentNumber } = await createToolboxRegisterPdf(id);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${documentNumber}.pdf"`,
    },
  });
}
