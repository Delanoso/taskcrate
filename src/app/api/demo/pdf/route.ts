import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createBrandedPdf } from "@/lib/pdf/branded-document";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bytes, documentNumber } = await createBrandedPdf({
    organizationId: session.organizationId,
    documentTitle: "Sample branded export",
    bodyLines: [
      "This PDF demonstrates the shared header and footer used by every TaskCrate module.",
      "Header: document title + your company name (logo URL supported in production uploads).",
      "Footer: created date, document number, and company display name.",
      "Brand colours from your workspace settings are applied to headings.",
    ],
    prefix: "SMP",
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${documentNumber}.pdf"`,
    },
  });
}
