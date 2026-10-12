import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildPermitClosedPdf } from "@/lib/modules/permit-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireProductApi("permit-to-work");
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const item = await db.workPermit.findFirst({
    where: { id, organizationId: gate.session.organizationId },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.status !== "closed") {
    return NextResponse.json(
      { error: "PDF is available after the permit is closed." },
      { status: 400 },
    );
  }

  const pdf = await buildPermitClosedPdf(item);
  if (!item.documentNumber) {
    await db.workPermit.update({
      where: { id: item.id },
      data: { documentNumber: pdf.documentNumber },
    });
  }

  return new NextResponse(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.documentNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
