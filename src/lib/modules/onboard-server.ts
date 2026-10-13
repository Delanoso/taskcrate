import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { z } from "zod";
import type { OnboardingDocument, OnboardingPacket } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { appUrl, jsonList, saDateKey } from "@/lib/modules/common";
import { ACCOUNT_TYPES, isKnownItem, itemHint, itemLabel, maskAccount, parseSaId, type Bank, type Personal } from "@/lib/modules/onboard-items";

export const SLUG = "onboard-docs";
export const FOLDER = "onboard";

// Same key derivation as the original bank-detail encryption so existing packets still decrypt.
const key = () => scryptSync(process.env.SESSION_SECRET ?? "dev", "bank-salt", 32);

export function encrypt(json: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

export function decrypt<T>(blob: string | null | undefined): T | null {
  if (!blob) return null;
  try {
    const buf = Buffer.from(blob, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Legacy packets stored { bankName, accountName, accountNumber, branchCode }. */
export function readBank(blob: string | null | undefined): Bank | null {
  const b = decrypt<Partial<Bank> & { accountName?: string }>(blob);
  if (!b) return null;
  return {
    bankName: b.bankName ?? "",
    accountHolder: b.accountHolder ?? b.accountName ?? "",
    accountNumber: b.accountNumber ?? "",
    accountType: b.accountType ?? "",
    branchCode: b.branchCode ?? "",
  };
}

const s = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max);
const o = (max: number) => z.string().trim().max(max).nullable().optional();
const phone = z.string().trim().regex(/^[+\d][\d\s()-]{8,18}$/, "Enter a valid phone number");

export const personalInput = z
  .object({
    firstNames: s(1, 100, "Enter your first name(s)"),
    surname: s(1, 100, "Enter your surname"),
    preferredName: o(60),
    idType: z.enum(["sa_id", "passport"]),
    idNumber: s(5, 30, "Enter your ID or passport number"),
    passportCountry: o(60),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
    gender: o(20),
    nationality: o(60),
    cellphone: phone,
    email: z.string().trim().email("Enter a valid email address").max(200).nullable().optional().or(z.literal("")),
    homeAddress: s(5, 400, "Enter your home address"),
    postalCode: o(10),
    taxNumber: z.string().trim().regex(/^\d{10}$/, "A SARS tax number has 10 digits").nullable().optional().or(z.literal("")),
    emergencyName: s(2, 120, "Enter an emergency contact"),
    emergencyRelationship: s(2, 60, "Enter their relationship to you"),
    emergencyPhone: phone,
  })
  .superRefine((p, ctx) => {
    if (p.idType === "sa_id") {
      const r = parseSaId(p.idNumber);
      if (!r.valid) ctx.addIssue({ code: "custom", path: ["idNumber"], message: r.reason });
    } else if (!p.passportCountry) {
      ctx.addIssue({ code: "custom", path: ["passportCountry"], message: "Enter the country that issued your passport" });
    }
  });

export const bankInput = z.object({
  bankName: s(2, 80, "Choose your bank"),
  accountHolder: s(2, 120, "Enter the account holder's name"),
  accountNumber: z.string().trim().regex(/^\d{6,16}$/, "Account number should be 6 to 16 digits"),
  accountType: z.enum(ACCOUNT_TYPES),
  branchCode: z.string().trim().regex(/^\d{6}$/, "Branch code is 6 digits"),
});

export const requirementsInput = z.array(z.string().refine(isKnownItem, "Unknown document")).max(30);

/** What HR captures when creating or editing a packet. */
export const packetInput = z.object({
  employeeName: s(2, 120, "Enter the new hire's name"),
  employeePhone: o(40),
  employeeEmail: z.string().trim().email("Enter a valid email").max(200).nullable().optional().or(z.literal("")),
  employeeNumber: o(40),
  jobTitle: o(80),
  department: o(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")),
  requirements: requirementsInput.optional(),
});

export const publicUrl = (token: string) => `${appUrl()}/p/onboard/${token}`;

/** Statuses in which the new hire may still change their pack. */
export const EDITABLE = ["sent", "in_progress", "changes_requested"];

export async function loadPublicPacket(token: string) {
  if (token.length < 10) return null;
  return db.onboardingPacket.findUnique({ where: { publicToken: token }, include: { documents: { orderBy: { createdAt: "asc" } } } });
}

type PacketWithDocs = OnboardingPacket & { documents: OnboardingDocument[] };

function requirements(p: PacketWithDocs) {
  const keys = jsonList(p.requirementsJson);
  return keys.map((k) => ({
    key: k,
    label: itemLabel(k),
    hint: itemHint(k),
    files: p.documents.filter((d) => d.itemKey === k).map((d) => ({ id: d.id, fileName: d.fileName, mimeType: d.mimeType, sizeBytes: d.sizeBytes })),
  }));
}

export function progress(p: PacketWithDocs) {
  const reqs = requirements(p);
  const parts = [!!p.personalJson, !!p.bankJson, ...reqs.map((r) => r.files.length > 0)];
  const done = parts.filter(Boolean).length;
  return { done, total: parts.length, percent: Math.round((done / parts.length) * 100), missing: reqs.filter((r) => !r.files.length).map((r) => r.label) };
}

export function serializeSummary(p: PacketWithDocs) {
  const status = p.status === "completed" ? "submitted" : p.status;
  return {
    id: p.id,
    employeeName: p.employeeName,
    employeePhone: p.employeePhone,
    employeeEmail: p.employeeEmail,
    employeeNumber: p.employeeNumber,
    jobTitle: p.jobTitle,
    department: p.department,
    startDate: p.startDate ? saDateKey(p.startDate) : null,
    status,
    progress: progress(p),
    publicUrl: publicUrl(p.publicToken),
    submittedAt: p.submittedAt?.toISOString() ?? null,
    reviewedAt: p.reviewedAt?.toISOString() ?? null,
    reviewedBy: p.reviewedBy,
    reviewNote: p.reviewNote,
    leaveEmployeeId: p.leaveEmployeeId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Full view for HR; bank details stay masked until explicitly revealed. */
export function serializeDetail(p: PacketWithDocs) {
  const bank = readBank(p.bankJson);
  return {
    ...serializeSummary(p),
    requirements: requirements(p),
    personal: decrypt<Personal>(p.personalJson),
    bank: bank ? { bankName: bank.bankName, accountType: bank.accountType, accountMasked: maskAccount(bank.accountNumber) } : null,
    bankViews: (() => {
      try {
        return JSON.parse(p.bankViewLog) as { by: string; at: string }[];
      } catch {
        return [];
      }
    })(),
    consentName: p.consentName,
    consentAt: p.consentAt?.toISOString() ?? null,
    hasSignature: !!p.consentSignature,
    legacyDocs: [p.idDocUrl && { label: "ID document (legacy upload)", url: p.idDocUrl }, p.addressDocUrl && { label: "Proof of address (legacy upload)", url: p.addressDocUrl }].filter(
      (x): x is { label: string; url: string } => !!x && !x.url.includes("placeholder"),
    ),
  };
}

export type PacketSummary = ReturnType<typeof serializeSummary>;
export type PacketDetail = ReturnType<typeof serializeDetail>;
