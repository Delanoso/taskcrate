import { db } from "@/lib/db";
import { notFound } from "@/lib/modules/common";
import { documentResponse, readDocument } from "@/lib/file-storage";
import { FOLDER } from "@/lib/modules/contract-server";

/** The original PDF the employee is asked to sign (pdf documents only). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const d = token.length < 10 ? null : await db.contractDocument.findUnique({ where: { publicToken: token } });
  if (!d?.sourceFileUrl || d.status === "voided") return notFound();
  try {
    return documentResponse(await readDocument({ fileUrl: d.sourceFileUrl, fileName: `${d.title}.pdf`, mimeType: "application/pdf" }, FOLDER), false);
  } catch {
    return notFound();
  }
}
