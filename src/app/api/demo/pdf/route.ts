import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { pdfResponse } from "@/lib/modules/common";
import { createBrandedDocument } from "@/lib/modules/pdf-kit";

/** A sample page so a company can check its logo and colours before sending real documents. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await createBrandedDocument({ organizationId: session.organizationId, title: "Sample document", documentNumber: "SAMPLE" });
  doc.heading("Your branding");
  doc.paragraph("This is how every PDF from your TaskCrate apps looks: your logo and company name in the header, your primary colour on headings and lines, and the date, document number and your name in the footer with page numbers.");
  doc.heading("Example details");
  doc.field("Employee", "Sipho Ndlovu");
  doc.field("Reference", "AOD-00012");
  doc.field("Amount", "R 3 000.00");
  doc.field("Status", "Signed");
  doc.heading("Signatures");
  await doc.signatures([{ label: "Employee", name: "Sipho Ndlovu", note: "Signature appears here" }, { label: "For the company", name: doc.companyName, note: "Signature appears here" }]);
  return pdfResponse(await doc.finish(), "Sample branded PDF");
}
