import { randomBytes } from "crypto";
import { z } from "zod";
import type { EquipmentCustodyLog, EquipmentIssue, EquipmentItem } from "@/generated/prisma/client";
import { companyHasApp } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { appUrl, jsonList, saDateKey } from "@/lib/modules/common";
import { CATEGORIES, CONDITIONS, OUTCOMES, type Checklist } from "@/lib/modules/equipment-options";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";

export const ISSUER = "equipment-issuer";
export const HANDBACK = "equipment-handback";
export const FOLDER = "equipment";
export const LEDGER = "loan-deductible-ledger";

/** The register is shared: either module opens it. */
export async function requireEquipmentApi() {
  const issuer = await requireProductApi(ISSUER);
  if (!("error" in issuer)) return issuer;
  const handback = await requireProductApi(HANDBACK);
  return "error" in handback ? issuer : handback;
}

export const newToken = () => randomBytes(18).toString("base64url");
export const newBatch = () => randomBytes(6).toString("hex");
export const signingUrl = (token: string) => `${appUrl()}/p/equipment/${token}`;

export async function hasLedger(organizationId: string) {
  return companyHasApp(organizationId, LEDGER);
}

export function serializeItem(i: EquipmentItem) {
  return {
    id: i.id,
    name: i.name,
    assetTag: i.assetTag,
    category: i.category,
    serialNumber: i.serialNumber,
    value: i.value,
    condition: i.condition,
    status: i.status,
    location: i.location,
    notes: i.notes,
    photoUrl: i.photoUrl,
    createdAt: i.createdAt.toISOString(),
  };
}

export function serializeIssue(x: EquipmentIssue, now = Date.now()) {
  const due = x.dueBackAt ? saDateKey(x.dueBackAt) : null;
  const out = x.status === "active" || x.status === "awaiting_signature";
  return {
    id: x.id,
    itemId: x.itemId,
    batchId: x.batchId,
    documentNumber: x.documentNumber,
    signingUrl: signingUrl(x.publicToken),
    employeeName: x.employeeName,
    employeeNumber: x.employeeNumber,
    employeePhone: x.employeePhone,
    dueBackAt: due,
    overdue: out && !!x.dueBackAt && x.dueBackAt.getTime() < now,
    conditionOut: x.conditionOut,
    accessories: x.accessories,
    notesOut: x.notesOut,
    issuedBy: x.issuedBy,
    issuedAt: x.createdAt.toISOString(),
    status: x.status,
    signMethod: x.signMethod,
    signerName: x.signerName,
    signedAt: x.signedAt?.toISOString() ?? null,
    signIp: x.signIp,
    lastRemindedAt: x.lastRemindedAt?.toISOString() ?? null,
    reminderCount: x.reminderCount,
    returnBatchId: x.returnBatchId,
    handbackNumber: x.handbackNumber,
    returnedAt: x.returnedAt?.toISOString() ?? null,
    receivedBy: x.receivedBy,
    conditionIn: x.conditionIn,
    checklist: readChecklist(x.checklistJson),
    damageNotes: x.damageNotes,
    photos: jsonList(x.photosJson),
    repairCost: x.repairCost,
    outcome: x.outcome,
    employeePresent: x.employeePresent,
    returnSignerName: x.returnSignerName,
    hasReturnSignature: !!x.returnSignatureUrl,
    deductibleId: x.deductibleId,
    cancelReason: x.cancelReason,
  };
}
export type IssueRow = ReturnType<typeof serializeIssue>;
export type ItemRow = ReturnType<typeof serializeItem>;

export function serializeLog(l: EquipmentCustodyLog) {
  return { id: l.id, issueId: l.issueId, action: l.action, employeeName: l.employeeName, by: l.by, note: l.conditionNotes, photoUrl: l.damagePhotoUrl, at: l.createdAt.toISOString() };
}
export type LogRow = ReturnType<typeof serializeLog>;

export function readChecklist(json: string | null): Checklist {
  try {
    const v = JSON.parse(json ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function logEvent(data: { organizationId: string; itemId: string; issueId?: string | null; employeeName: string; action: string; by?: string | null; note?: string | null; photoUrl?: string | null }) {
  return db.equipmentCustodyLog.create({
    data: {
      organizationId: data.organizationId,
      itemId: data.itemId,
      issueId: data.issueId ?? null,
      employeeName: data.employeeName,
      action: data.action,
      by: data.by ?? null,
      conditionNotes: data.note ?? null,
      damagePhotoUrl: data.photoUrl ?? null,
    },
  });
}

const keys = <T extends readonly { key: string }[]>(list: T) => list.map((x) => x.key) as [T[number]["key"], ...T[number]["key"][]];
const optText = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => v || null);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
export const signatureSchema = z.string().regex(/^data:image\/png;base64,/, "Signature is required").max(1_500_000);

export const itemInput = z.object({
  name: z.string().trim().min(2, "Give the item a name").max(120),
  assetTag: optText(40),
  category: z.enum(keys(CATEGORIES)).default("other"),
  serialNumber: optText(80),
  value: z.number().min(0).max(10_000_000).nullable().optional(),
  condition: z.enum(keys(CONDITIONS)).default("good"),
  location: optText(80),
  notes: optText(1000),
});

export const issueInput = z.object({
  itemIds: z.array(z.string()).min(1, "Pick at least one item").max(50),
  employeeName: z.string().trim().min(2, "Who is receiving the items?").max(120),
  employeeNumber: optText(40),
  employeePhone: optText(30),
  dueBackAt: dateKey.nullable().optional(),
  accessories: optText(300),
  notesOut: optText(1000),
  conditions: z.record(z.string(), z.enum(keys(CONDITIONS))).default({}),
  method: z.enum(["in_person", "link"]),
  signerName: optText(120),
  signature: signatureSchema.nullable().optional(),
  agree: z.boolean().optional(),
});

export const handbackInput = z.object({
  issueIds: z.array(z.string()).min(1, "Pick at least one item").max(50),
  lines: z.record(
    z.string(),
    z.object({
      conditionIn: z.enum(keys(CONDITIONS)),
      checklist: z.record(z.string(), z.boolean()).default({}),
      damageNotes: optText(2000),
      photos: z.array(z.string().regex(/^data:image\/(jpeg|png);base64,/)).max(6).default([]),
      repairCost: z.number().min(0).max(10_000_000).nullable().optional(),
      outcome: z.enum(keys(OUTCOMES)),
      raiseDeductible: z.boolean().default(false),
    }),
  ),
  employeePresent: z.boolean(),
  returnSignerName: optText(120),
  returnSignature: signatureSchema.nullable().optional(),
  inspectorSignature: signatureSchema,
});

/** Creates a pending deductible in the AOD Book for damage or loss. */
export async function raiseDeductible(issue: EquipmentIssue, item: EquipmentItem, amount: number, reason: string, photoUrl: string | null) {
  const rec = await db.loanDeductibleRecord.create({
    data: {
      organizationId: issue.organizationId,
      reference: await nextDocumentNumber(issue.organizationId, "AOD"),
      employeeName: issue.employeeName,
      employeeNumber: issue.employeeNumber,
      employeePhone: issue.employeePhone,
      recordType: "deductible",
      reason: issue.outcome === "lost" || reason.startsWith("reported lost") || reason === "not returned" ? "loss" : "damage",
      amount,
      description: `${item.name}${item.assetTag ? ` (${item.assetTag})` : ""} - ${reason}.`.slice(0, 1000),
      incidentDate: issue.returnedAt ?? new Date(),
      photoUrl,
      sourceRef: `Equipment ${issue.handbackNumber ?? issue.documentNumber}`,
      issuedBy: issue.receivedBy,
      status: "pending",
    },
  });
  await db.notification.create({
    data: {
      organizationId: issue.organizationId,
      productSlug: LEDGER,
      title: `Deductible raised for ${issue.employeeName}`,
      body: `R ${amount.toFixed(2)} for ${item.name}. Set the repayment plan in the AOD Book and send it to the employee to sign before anything is deducted.`,
    },
  });
  return rec.id;
}
