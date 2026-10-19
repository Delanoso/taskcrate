import { createBrandedDocument, nextDocumentNumber } from "@/lib/modules/pdf-kit";

/** A short branded PDF (logo, colours, footer, page numbers) from plain lines of text. */
export async function simpleBrandedPdf(input: {
  organizationId: string;
  title: string;
  prefix: string;
  lines: string[];
  /** Reuse an existing number when regenerating a filed PDF later. */
  documentNumber?: string;
}) {
  const documentNumber = input.documentNumber ?? (await nextDocumentNumber(input.organizationId, input.prefix));
  const doc = await createBrandedDocument({ organizationId: input.organizationId, title: input.title, documentNumber });
  for (const line of input.lines) {
    doc.paragraph(line);
    doc.y -= 4;
  }
  return { bytes: await doc.finish(), documentNumber };
}
