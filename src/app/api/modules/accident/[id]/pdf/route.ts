import { AccidentError } from "@/lib/modules/accident";
import { buildAccidentPdf, buildCoidaPack } from "@/lib/modules/accident-pdf";
import { requireProductApi } from "@/lib/modules/api-guard";
import { notFound, pdfResponse } from "@/lib/modules/common";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi("accident-report");
  if ("error" in gate) return gate.error;
  try {
    const id = (await params).id;
    const pack = new URL(req.url).searchParams.get("pack") === "coida";
    const pdf = pack ? await buildCoidaPack(gate.session.organizationId, id) : await buildAccidentPdf(gate.session.organizationId, id);
    return pdfResponse(pdf.bytes, pdf.fileName);
  } catch (error) {
    if (error instanceof AccidentError) return notFound();
    throw error;
  }
}
