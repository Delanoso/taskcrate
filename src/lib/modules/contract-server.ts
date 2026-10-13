import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import type { ContractDocument, ContractTemplate } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { appUrl, companyName, removeUpload, saDateKey } from "@/lib/modules/common";
import { readDocument } from "@/lib/file-storage";
import { parseBlocks } from "@/lib/modules/contract-library";
import { createBrandedDocument, embedImage, fit, fmtDateTime, safe } from "@/lib/modules/pdf-kit";

export const SLUG = "contract-sentinel";
export const FOLDER = "contract";

export const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
export const signingUrl = (token: string) => `${appUrl()}/p/contract/${token}`;
export const newToken = () => randomBytes(16).toString("base64url");

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim().slice(0, 64) || null;
}

/** Legacy rows were "signed" with no countersign step. */
export const normStatus = (s: string) => (s === "signed" ? "completed" : s);
export const OPEN = ["sent", "viewed"];

const s = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max);
const o = (max: number) => z.string().trim().max(max).nullable().optional();
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

export const templateInput = z.object({
  name: s(2, 120, "Give the template a name"),
  category: z.enum(["contract", "policy", "other"]).default("contract"),
  bodyText: z.string().max(60_000).default(""),
  requireCountersign: z.boolean().default(false),
  dueDays: z.number().int().min(1).max(90).nullable().optional(),
});

export const recipientInput = z.object({
  name: s(2, 120, "Enter each person's name"),
  phone: o(40),
  email: z.string().trim().email("Enter a valid email").max(200).nullable().optional().or(z.literal("")),
  employeeNumber: o(40),
  jobTitle: o(80),
});

export const sendInput = z
  .object({
    templateId: z.string().nullable().optional(),
    title: o(160),
    bodyText: z.string().max(60_000).nullable().optional(),
    recipients: z.array(recipientInput).min(1, "Add at least one person").max(200),
    fields: z.record(z.string(), z.string().max(500)).default({}),
    dueDate: dateKey.nullable().optional().or(z.literal("")),
    requireCountersign: z.boolean().optional(),
  })
  .refine((v) => v.templateId || ((v.title?.length ?? 0) >= 2 && (v.bodyText?.trim().length ?? 0) >= 20), {
    message: "Choose a template, or enter a title and the document text",
  });

export type DocWithTemplate = ContractDocument & { template?: Pick<ContractTemplate, "name"> | null };

export function serializeDoc(d: DocWithTemplate) {
  const status = normStatus(d.status);
  const today = saDateKey();
  const due = d.dueDate ? saDateKey(d.dueDate) : null;
  return {
    id: d.id,
    reference: d.reference ?? `CS-${d.id.slice(-5).toUpperCase()}`,
    title: d.title,
    kind: d.kind,
    templateId: d.templateId,
    templateName: d.template?.name ?? null,
    status,
    employeeName: d.employeeName ?? d.signerName ?? "Unnamed",
    employeePhone: d.employeePhone ?? (d.employeeContact && /\d{6}/.test(d.employeeContact) ? d.employeeContact : null),
    employeeEmail: d.employeeEmail ?? (d.employeeContact?.includes("@") ? d.employeeContact : null),
    employeeNumber: d.employeeNumber,
    jobTitle: d.jobTitle,
    batchId: d.batchId,
    dueDate: due,
    overdue: !!due && OPEN.includes(status) && due < today,
    requireCountersign: d.requireCountersign,
    sentBy: d.sentBy,
    createdAt: d.createdAt.toISOString(),
    viewedAt: d.viewedAt?.toISOString() ?? null,
    signedAt: d.signedAt?.toISOString() ?? null,
    signerName: d.signerName ?? (d.signedAt ? d.employeeName : null),
    declinedAt: d.declinedAt?.toISOString() ?? null,
    declineReason: d.declineReason,
    voidedAt: d.voidedAt?.toISOString() ?? null,
    voidReason: d.voidReason,
    countersignedAt: d.countersignedAt?.toISOString() ?? null,
    countersignName: d.countersignName,
    lastRemindedAt: d.lastRemindedAt?.toISOString() ?? null,
    reminderCount: d.reminderCount,
    signingUrl: signingUrl(d.publicToken),
  };
}
export type ContractDoc = ReturnType<typeof serializeDoc>;

/** Admin detail adds the audit fields and the content. */
export function serializeDetail(d: DocWithTemplate) {
  return {
    ...serializeDoc(d),
    bodyText: d.kind === "text" ? d.bodyText : null,
    pageCount: d.pageCount,
    contentHash: d.contentHash,
    viewIp: d.viewIp,
    signIp: d.signIp,
    signUserAgent: d.signUserAgent,
    signerIdNumber: d.signerIdNumber,
  };
}
export type ContractDetail = ReturnType<typeof serializeDetail>;

export function serializeTemplate(t: ContractTemplate, counts?: { sent: number; completed: number; open: number }) {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    kind: t.kind,
    bodyText: t.bodyText,
    fileName: t.fileName,
    pageCount: t.pageCount,
    requireCountersign: t.requireCountersign,
    dueDays: t.dueDays,
    archived: t.archived,
    updatedAt: t.updatedAt.toISOString(),
    counts: counts ?? { sent: 0, completed: 0, open: 0 },
  };
}
export type Template = ReturnType<typeof serializeTemplate>;

/** Validates an uploaded contract PDF and returns its page count. */
export async function pdfPageCount(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
  return pdf.getPageCount();
}

async function sourceBytes(d: ContractDocument) {
  if (!d.sourceFileUrl) throw new Error("Original PDF is missing");
  return (await readDocument({ fileUrl: d.sourceFileUrl, fileName: "contract.pdf", mimeType: "application/pdf" }, FOLDER)).bytes;
}

/** Hash of exactly what the employee is asked to sign. */
export async function contentHashFor(kind: string, bodyText: string, sourceFileUrl: string | null) {
  if (kind === "pdf" && sourceFileUrl) {
    const f = await readDocument({ fileUrl: sourceFileUrl, fileName: "contract.pdf", mimeType: "application/pdf" }, FOLDER);
    return sha256(f.bytes);
  }
  return sha256(bodyText);
}

/** Small signature + name box in the bottom-right corner of every page. */
async function stampPages(pdf: PDFDocument, pages: ReturnType<PDFDocument["getPages"]>, d: ContractDocument) {
  const sigUrl = d.signatureUrl ?? d.signatureData;
  if (!d.signedAt || !sigUrl) return;
  const img = await embedImage(pdf, sigUrl);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const name = safe(d.signerName ?? d.employeeName ?? "");
  const when = fmtDateTime(d.signedAt);
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const boxW = 196;
    const x = width - boxW - 10;
    const y = 6;
    page.drawRectangle({ x, y, width: boxW, height: 30, color: rgb(1, 1, 1), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5, opacity: 0.95 });
    if (img) {
      const sc = Math.min(64 / img.width, 24 / img.height);
      page.drawImage(img, { x: x + 4, y: y + 3, width: img.width * sc, height: img.height * sc });
    }
    page.drawText(fit(`Signed: ${name}`, font, 7, boxW - 78), { x: x + 72, y: y + 19, size: 7, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(fit(`${when} · p${i + 1}/${pages.length}`, font, 6.5, boxW - 78), { x: x + 72, y: y + 8, size: 6.5, font, color: rgb(0.4, 0.4, 0.4) });
  });
}

async function appendix(doc: Awaited<ReturnType<typeof createBrandedDocument>>, d: ContractDocument, company: string, pageCount: number) {
  doc.ensure(160);
  doc.heading("Signatures");
  const items: Parameters<typeof doc.signatures>[0] = [
    { label: "Employee", name: d.signerName ?? (d.signedAt ? d.employeeName : d.employeeName), date: d.signedAt, url: d.signatureUrl ?? d.signatureData, note: d.signedAt ? "" : "Not signed yet" },
  ];
  if (d.requireCountersign) {
    items.push({ label: `For ${company}`, name: d.countersignName, date: d.countersignedAt, url: d.countersignUrl, note: "Awaiting countersignature" });
  }
  await doc.signatures(items);

  doc.heading("Signing certificate");
  doc.field("Reference", d.reference);
  doc.field("Document", d.title);
  doc.field("Pages signed", String(pageCount));
  doc.field("Document fingerprint", d.contentHash ? `SHA-256 ${d.contentHash}` : "-");
  doc.field("Sent", `${fmtDateTime(d.createdAt)}${d.sentBy ? ` by ${d.sentBy}` : ""}`);
  doc.field("Opened", d.viewedAt ? `${fmtDateTime(d.viewedAt)}${d.viewIp ? ` from ${d.viewIp}` : ""}` : "-");
  doc.field("Signed by", d.signedAt ? `${d.signerName ?? d.employeeName}${d.signerIdNumber ? ` (ID ${d.signerIdNumber})` : ""}` : "-");
  doc.field("Signed at", d.signedAt ? `${fmtDateTime(d.signedAt)}${d.signIp ? ` from ${d.signIp}` : ""}` : "-");
  if (d.signUserAgent) doc.field("Device", d.signUserAgent.slice(0, 160));
  if (d.requireCountersign) doc.field("Countersigned", d.countersignedAt ? `${d.countersignName} at ${fmtDateTime(d.countersignedAt)}` : "Pending");
  doc.y -= 6;
  doc.paragraph(
    "Signed electronically in terms of the Electronic Communications and Transactions Act 25 of 2002. The signer reviewed the document, confirmed their name and drew their signature once; that signature is stamped on every page above. The fingerprint identifies the exact content that was signed.",
    { size: 8, color: doc.muted },
  );
}

/** Builds the PDF: preview if unsigned, otherwise with the signature stamped on every page plus the certificate. */
export async function buildContractPdf(d: ContractDocument) {
  const company = await companyName(d.organizationId);
  const reference = d.reference ?? `CS-${d.id.slice(-5).toUpperCase()}`;

  if (d.kind === "pdf") {
    const src = await PDFDocument.load(await sourceBytes(d), { ignoreEncryption: true });
    const pages = src.getPages();
    await stampPages(src, pages, d);
    const app = await createBrandedDocument({ organizationId: d.organizationId, title: d.title, documentNumber: reference });
    await appendix(app, d, company, pages.length);
    const appPdf = await PDFDocument.load(await app.finish());
    for (const p of await src.copyPages(appPdf, appPdf.getPageIndices())) src.addPage(p);
    return src.save();
  }

  const doc = await createBrandedDocument({ organizationId: d.organizationId, title: d.title, documentNumber: reference });
  for (const b of parseBlocks(d.bodyText)) {
    if (b.type === "heading") doc.heading(b.text, 10.5);
    else if (b.type === "bullet") {
      doc.paragraph(`-  ${b.text}`, { indent: 8 });
      doc.y -= 1;
    } else {
      doc.paragraph(b.text);
      doc.y -= 6;
    }
  }
  doc.y -= 8;
  const bodyPages = doc.pdf.getPageCount();
  await appendix(doc, d, company, bodyPages);
  await stampPages(doc.pdf, doc.pdf.getPages().slice(0, bodyPages), d);
  return doc.finish();
}

/** Saves the final signed PDF so the signed copy never changes afterwards. */
export async function storeSignedPdf(d: ContractDocument) {
  const bytes = await buildContractPdf(d);
  const folder = `${FOLDER}/${d.organizationId}`;
  await mkdir(path.join(process.cwd(), "public", "uploads", folder), { recursive: true });
  const name = `${(d.reference ?? d.id).replace(/[^\w-]/g, "")}-signed-${randomBytes(5).toString("hex")}.pdf`;
  await writeFile(path.join(process.cwd(), "public", "uploads", folder, name), bytes);
  if (d.signedPdfUrl) await removeUpload(d.signedPdfUrl, FOLDER, d.organizationId);
  const url = `/uploads/${folder}/${name}`;
  await db.contractDocument.update({ where: { id: d.id }, data: { signedPdfUrl: url } });
  return { url, bytes };
}

/** Stored signed copy if there is one, otherwise build it now (legacy rows and previews). */
export async function contractPdfBytes(d: ContractDocument) {
  if (d.signedPdfUrl) {
    try {
      return (await readDocument({ fileUrl: d.signedPdfUrl, fileName: "signed.pdf", mimeType: "application/pdf" }, FOLDER)).bytes;
    } catch {
      // fall through and rebuild
    }
  }
  return buildContractPdf(d);
}
