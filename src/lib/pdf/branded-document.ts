import { simpleBrandedPdf } from "@/lib/modules/pdf-simple";

export type BrandedPdfInput = {
  organizationId: string;
  documentTitle: string;
  bodyLines: string[];
  prefix?: string;
};

export async function createBrandedPdf(input: BrandedPdfInput): Promise<{ bytes: Uint8Array; documentNumber: string }> {
  return simpleBrandedPdf({ organizationId: input.organizationId, title: input.documentTitle, prefix: input.prefix ?? "DOC", lines: input.bodyLines });
}
