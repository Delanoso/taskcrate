import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { appOrigin, sendEmail } from "@/lib/email";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { isWaPhone, waLink } from "@/lib/phone";
import {
  BUILTIN_TEMPLATES,
  addDays,
  emptyToNull,
  formatMoney,
  isCurrency,
  priceTotals,
  todayIso,
  type LineInput,
} from "@/lib/modules/billing-shared";

export class BillingError extends Error {}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const profileSchema = z.object({
  legalName: z.string().trim().min(2, "Add the legal name").max(160),
  tradingName: optionalText(160),
  registrationNumber: optionalText(40),
  vatRegistered: z.boolean(),
  vatNumber: optionalText(40),
  vatPercent: z.number().min(0).max(30),
  address: optionalText(500),
  email: optionalText(120),
  phone: optionalText(40),
  bankName: optionalText(80),
  accountName: optionalText(120),
  accountNumber: optionalText(40),
  branchCode: optionalText(20),
  accountType: optionalText(40),
  defaultCurrency: z.string(),
  paymentTermsDays: z.number().int().min(0).max(180),
  quoteValidDays: z.number().int().min(1).max(365),
  terms: optionalText(2000),
  footerNote: optionalText(500),
});

const lineSchema = z.object({
  description: z.string().trim().min(1, "Each line needs a description").max(300),
  quantity: z.number().positive("Quantity must be above 0").max(1_000_000),
  unit: z.string().trim().max(30).optional().default(""),
  unitPrice: z.number().min(0).max(100_000_000),
});

const documentSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["QUOTE", "INVOICE"]),
  templateName: optionalText(80),
  currency: z.string(),
  chargeVat: z.boolean(),
  clientName: z.string().trim().min(2, "Add the client name").max(160),
  clientCompany: optionalText(160),
  clientEmail: optionalText(120),
  clientPhone: optionalText(40),
  clientAddress: optionalText(500),
  clientVatNumber: optionalText(40),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid issue date"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  theirReference: optionalText(80),
  notes: optionalText(2000),
  terms: optionalText(2000),
  lines: z.array(lineSchema).min(1, "Add at least one line").max(40),
});

type StoredLine = { description: string; quantity: number; unit: string; unitPriceCents: number };

function storedLines(lines: LineInput[]): StoredLine[] {
  return lines.map((line) => ({
    description: line.description.trim(),
    quantity: line.quantity,
    unit: line.unit.trim(),
    unitPriceCents: Math.round(line.unitPrice * 100),
  }));
}

function viewLines(json: string): LineInput[] {
  try {
    const parsed = JSON.parse(json) as StoredLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unit: line.unit ?? "",
      unitPrice: line.unitPriceCents / 100,
    }));
  } catch {
    return [];
  }
}

function toDocument(row: {
  id: string;
  kind: string;
  number: string;
  status: string;
  templateName: string | null;
  currency: string;
  chargeVat: boolean;
  vatPercent: number;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  clientVatNumber: string | null;
  issueDate: string;
  dueDate: string | null;
  theirReference: string | null;
  notes: string | null;
  terms: string | null;
  linesJson: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  paidOn: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  sourceQuoteId: string | null;
}) {
  return { ...row, lines: viewLines(row.linesJson) };
}

export async function billingSnapshot(organizationId: string) {
  const [profile, custom, documents] = await Promise.all([
    db.billingProfile.findUnique({ where: { organizationId } }),
    db.billingTemplate.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    db.billingDocument.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }),
  ]);
  const invoiceByQuote = new Map(
    documents.filter((doc) => doc.sourceQuoteId).map((doc) => [doc.sourceQuoteId!, doc]),
  );
  return {
    profile,
    templates: [
      ...BUILTIN_TEMPLATES.map((template) => ({ id: `builtin:${template.name}`, custom: false, ...template })),
      ...custom.map((template) => ({
        id: template.id,
        custom: true,
        name: template.name,
        notes: template.notes ?? "",
        terms: template.terms ?? "",
        lines: viewLines(template.linesJson),
      })),
    ],
    documents: documents.map((doc) => ({
      ...toDocument(doc),
      invoiceNumber: doc.kind === "QUOTE" ? invoiceByQuote.get(doc.id)?.number ?? null : null,
      invoiceId: doc.kind === "QUOTE" ? invoiceByQuote.get(doc.id)?.id ?? null : null,
    })),
  };
}

export async function saveBillingProfile(organizationId: string, raw: unknown) {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) throw new BillingError(parsed.error.issues[0]?.message ?? "Check the company details");
  const data = parsed.data;
  if (!isCurrency(data.defaultCurrency)) throw new BillingError("Choose a currency");
  if (data.vatRegistered && !data.vatNumber?.trim()) throw new BillingError("Add the VAT number");
  const saved = {
    legalName: data.legalName,
    tradingName: emptyToNull(data.tradingName),
    registrationNumber: emptyToNull(data.registrationNumber),
    vatRegistered: data.vatRegistered,
    vatNumber: data.vatRegistered ? emptyToNull(data.vatNumber) : null,
    vatPercent: data.vatRegistered ? data.vatPercent : 0,
    address: emptyToNull(data.address),
    email: emptyToNull(data.email),
    phone: emptyToNull(data.phone),
    bankName: emptyToNull(data.bankName),
    accountName: emptyToNull(data.accountName),
    accountNumber: emptyToNull(data.accountNumber),
    branchCode: emptyToNull(data.branchCode),
    accountType: emptyToNull(data.accountType),
    defaultCurrency: data.defaultCurrency,
    paymentTermsDays: data.paymentTermsDays,
    quoteValidDays: data.quoteValidDays,
    terms: emptyToNull(data.terms),
    footerNote: emptyToNull(data.footerNote),
  };
  return db.billingProfile.upsert({
    where: { organizationId },
    create: { organizationId, ...saved },
    update: saved,
  });
}

export async function saveBillingTemplate(organizationId: string, raw: unknown) {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      notes: optionalText(2000),
      terms: optionalText(2000),
      lines: z.array(lineSchema).min(1).max(40),
    })
    .safeParse(raw);
  if (!parsed.success) throw new BillingError(parsed.error.issues[0]?.message ?? "Check the template");
  if (BUILTIN_TEMPLATES.some((template) => template.name.toLowerCase() === parsed.data.name.toLowerCase())) {
    throw new BillingError("That name is already one of the built-in templates. Choose another name.");
  }
  const linesJson = JSON.stringify(storedLines(parsed.data.lines));
  return db.billingTemplate.upsert({
    where: { organizationId_name: { organizationId, name: parsed.data.name } },
    create: {
      organizationId,
      name: parsed.data.name,
      notes: emptyToNull(parsed.data.notes),
      terms: emptyToNull(parsed.data.terms),
      linesJson,
    },
    update: { notes: emptyToNull(parsed.data.notes), terms: emptyToNull(parsed.data.terms), linesJson },
  });
}

export async function deleteBillingTemplate(organizationId: string, id: string) {
  const template = await db.billingTemplate.findFirst({ where: { id, organizationId } });
  if (!template) throw new BillingError("Template not found");
  await db.billingTemplate.delete({ where: { id } });
}

export async function saveBillingDocument(organizationId: string, raw: unknown) {
  const profile = await db.billingProfile.findUnique({ where: { organizationId } });
  if (!profile) throw new BillingError("Save the company details first");
  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success) throw new BillingError(parsed.error.issues[0]?.message ?? "Check the document");
  const data = parsed.data;
  if (!isCurrency(data.currency)) throw new BillingError("Choose a currency");
  const chargeVat = profile.vatRegistered && data.chargeVat;
  const vatPercent = chargeVat ? profile.vatPercent : 0;
  const totals = priceTotals(data.lines, chargeVat, vatPercent);
  const issueDate = data.issueDate;
  const dueDate =
    emptyToNull(data.dueDate) ??
    addDays(issueDate, data.kind === "QUOTE" ? profile.quoteValidDays : profile.paymentTermsDays);
  const record = {
    templateName: emptyToNull(data.templateName),
    currency: data.currency,
    chargeVat,
    vatPercent,
    clientName: data.clientName,
    clientCompany: emptyToNull(data.clientCompany),
    clientEmail: emptyToNull(data.clientEmail),
    clientPhone: emptyToNull(data.clientPhone),
    clientAddress: emptyToNull(data.clientAddress),
    clientVatNumber: emptyToNull(data.clientVatNumber),
    issueDate,
    dueDate,
    theirReference: emptyToNull(data.theirReference),
    notes: emptyToNull(data.notes),
    terms: emptyToNull(data.terms),
    linesJson: JSON.stringify(storedLines(data.lines)),
    ...totals,
  };
  if (data.id) {
    const existing = await db.billingDocument.findFirst({ where: { id: data.id, organizationId } });
    if (!existing) throw new BillingError("Document not found");
    if (existing.status === "PAID") throw new BillingError("A paid invoice stays as it was marked. Mark it unpaid before editing.");
    if (existing.kind !== data.kind) throw new BillingError("A quotation stays a quotation. Turn it into an invoice instead of changing the type.");
    return db.billingDocument.update({ where: { id: existing.id }, data: record });
  }
  const number = await nextDocumentNumber(organizationId, data.kind === "QUOTE" ? "QT" : "INV");
  return db.billingDocument.create({
    data: {
      organizationId,
      kind: data.kind,
      number,
      status: data.kind === "QUOTE" ? "DRAFT" : "UNPAID",
      ...record,
    },
  });
}

export async function setBillingStatus(organizationId: string, raw: unknown) {
  const parsed = z
    .object({
      id: z.string(),
      status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED", "UNPAID", "PAID"]),
      paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      paymentMethod: optionalText(40),
      paymentReference: optionalText(80),
    })
    .safeParse(raw);
  if (!parsed.success) throw new BillingError(parsed.error.issues[0]?.message ?? "Check the status");
  const doc = await db.billingDocument.findFirst({ where: { id: parsed.data.id, organizationId } });
  if (!doc) throw new BillingError("Document not found");
  if (doc.kind === "QUOTE" && !["DRAFT", "SENT", "ACCEPTED", "DECLINED"].includes(parsed.data.status)) {
    throw new BillingError("A quotation is draft, sent, accepted or declined");
  }
  if (doc.kind === "INVOICE" && !["UNPAID", "PAID"].includes(parsed.data.status)) {
    throw new BillingError("An invoice is unpaid or paid");
  }
  const paid = parsed.data.status === "PAID";
  return db.billingDocument.update({
    where: { id: doc.id },
    data: {
      status: parsed.data.status,
      paidOn: paid ? emptyToNull(parsed.data.paidOn) ?? todayIso() : null,
      paymentMethod: paid ? emptyToNull(parsed.data.paymentMethod) : null,
      paymentReference: paid ? emptyToNull(parsed.data.paymentReference) : null,
    },
  });
}

export async function convertQuoteToInvoice(organizationId: string, id: string) {
  const quote = await db.billingDocument.findFirst({ where: { id, organizationId } });
  if (!quote || quote.kind !== "QUOTE") throw new BillingError("Quotation not found");
  if (quote.status === "DECLINED") throw new BillingError("A declined quotation is not turned into an invoice");
  const existing = await db.billingDocument.findFirst({ where: { organizationId, sourceQuoteId: quote.id } });
  if (existing) throw new BillingError(`This quotation already has invoice ${existing.number}`);
  const profile = await db.billingProfile.findUnique({ where: { organizationId } });
  const issueDate = todayIso();
  const number = await nextDocumentNumber(organizationId, "INV");
  const invoice = await db.billingDocument.create({
    data: {
      organizationId,
      kind: "INVOICE",
      number,
      status: "UNPAID",
      templateName: quote.templateName,
      currency: quote.currency,
      chargeVat: quote.chargeVat,
      vatPercent: quote.vatPercent,
      clientName: quote.clientName,
      clientCompany: quote.clientCompany,
      clientEmail: quote.clientEmail,
      clientPhone: quote.clientPhone,
      clientAddress: quote.clientAddress,
      clientVatNumber: quote.clientVatNumber,
      issueDate,
      dueDate: addDays(issueDate, profile?.paymentTermsDays ?? 30),
      theirReference: quote.theirReference,
      notes: quote.notes,
      terms: quote.terms,
      linesJson: quote.linesJson,
      subtotalCents: quote.subtotalCents,
      vatCents: quote.vatCents,
      totalCents: quote.totalCents,
      sourceQuoteId: quote.id,
    },
  });
  if (quote.status === "DRAFT" || quote.status === "SENT") {
    await db.billingDocument.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
  }
  return invoice;
}

function clientToken() {
  return randomBytes(16).toString("base64url");
}

/** A closed job card becomes a draft quotation. Labour uses the hourly rate; parts use the prices on the card. */
export async function quoteFromJobCard(organizationId: string, input: {
  jobNumber: string;
  title: string;
  hours: number | null;
  hourlyRate: number;
  parts: { name: string; qty: number; cost: number }[];
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  existingQuoteId?: string | null;
}) {
  if (input.existingQuoteId) {
    const existing = await db.billingDocument.findFirst({ where: { id: input.existingQuoteId, organizationId } });
    if (existing) return existing;
  }
  const profile = await db.billingProfile.findUnique({ where: { organizationId } });
  if (!profile) throw new BillingError("Save the company details in Quotations first. Then this job can become a quote.");
  const lines: LineInput[] = [];
  if (input.hours && input.hours > 0) {
    if (!(input.hourlyRate > 0)) throw new BillingError("Add the hourly rate for the labour.");
    lines.push({
      description: `Labour: ${input.title} (${input.hours} h)`,
      quantity: input.hours,
      unit: "hour",
      unitPrice: input.hourlyRate,
    });
  }
  for (const part of input.parts) {
    if (!part.name.trim() || !(part.qty > 0)) continue;
    lines.push({ description: part.name.trim(), quantity: part.qty, unit: "each", unitPrice: part.cost });
  }
  if (!lines.length) throw new BillingError("Add hours or parts with a price before creating a quote.");
  const chargeVat = profile.vatRegistered;
  const vatPercent = chargeVat ? profile.vatPercent : 0;
  const totals = priceTotals(lines, chargeVat, vatPercent);
  const issueDate = todayIso();
  const number = await nextDocumentNumber(organizationId, "QT");
  return db.billingDocument.create({
    data: {
      organizationId,
      kind: "QUOTE",
      number,
      status: "DRAFT",
      currency: profile.defaultCurrency,
      chargeVat,
      vatPercent,
      clientName: input.clientName.trim(),
      clientEmail: input.clientEmail?.trim() || null,
      clientPhone: input.clientPhone?.trim() || null,
      issueDate,
      dueDate: addDays(issueDate, profile.quoteValidDays),
      theirReference: input.jobNumber,
      notes: `From job card ${input.jobNumber}. ${input.title}`.slice(0, 2000),
      terms: profile.terms,
      linesJson: JSON.stringify(storedLines(lines)),
      publicToken: clientToken(),
      ...totals,
    },
  });
}

/** Emails the client a link, and returns a WhatsApp link when a phone number is on the document. */
export async function sendBillingDocument(organizationId: string, id: string) {
  const doc = await db.billingDocument.findFirst({ where: { id, organizationId } });
  if (!doc) throw new BillingError("Document not found");
  const token = doc.publicToken ?? clientToken();
  if (!doc.publicToken) await db.billingDocument.update({ where: { id }, data: { publicToken: token } });
  const url = `${appOrigin()}/p/document/${token}`;
  const profile = await db.billingProfile.findUnique({ where: { organizationId } });
  const from = profile?.tradingName || profile?.legalName || "We";
  const kind = doc.kind === "QUOTE" ? "quotation" : "invoice";
  const money = formatMoney(doc.totalCents, doc.currency);
  let emailed = false;
  if (doc.clientEmail) {
    const result = await sendEmail({
      to: doc.clientEmail,
      organizationId,
      kind: "billing_document",
      subject: `${doc.number} from ${from}`,
      lines: [
        `${from} sent you ${kind} ${doc.number} for ${money}.`,
        "Open it on your phone. The PDF is on that page.",
      ],
      button: { label: `Open the ${kind}`, url },
    });
    if (!result.ok) throw new BillingError(result.error);
    emailed = true;
  }
  await db.billingDocument.update({
    where: { id },
    data: {
      sentToClientAt: new Date(),
      ...(doc.kind === "QUOTE" && doc.status === "DRAFT" ? { status: "SENT" } : {}),
    },
  });
  return {
    url,
    waUrl: waLink(doc.clientPhone, `${from} sent you ${kind} ${doc.number} for ${money}: ${url}`),
    emailed,
    hasEmail: Boolean(doc.clientEmail),
    hasPhone: isWaPhone(doc.clientPhone),
  };
}
