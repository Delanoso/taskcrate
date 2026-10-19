import { z } from "zod";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";

const billSchema = z.object({
  id: z.string().optional(),
  supplierName: z.string().trim().min(2, "Add the supplier").max(160),
  reference: z.string().trim().max(80).optional(),
  amount: z.number().positive("Add the amount").max(100_000_000),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the due date"),
  note: z.string().trim().max(2000).optional(),
  photoDataUrl: z.string().startsWith("data:image/").max(1_500_000).optional(),
});

export async function listBills(organizationId: string) {
  return db.supplierBill.findMany({ where: { organizationId }, orderBy: { dueOn: "asc" } });
}

export async function saveBill(organizationId: string, raw: unknown) {
  const parsed = billSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the bill");
  const photoUrl = parsed.data.photoDataUrl ? await saveDataUrlUpload(parsed.data.photoDataUrl, `bills/${organizationId}`) : undefined;
  const data = {
    supplierName: parsed.data.supplierName,
    reference: parsed.data.reference?.trim() || null,
    amountCents: Math.round(parsed.data.amount * 100),
    dueOn: parsed.data.dueOn,
    note: parsed.data.note?.trim() || null,
    ...(photoUrl ? { photoUrl } : {}),
  };
  if (parsed.data.id) {
    const existing = await db.supplierBill.findFirst({ where: { id: parsed.data.id, organizationId, status: "open" } });
    if (!existing) throw new Error("That bill is already paid or was not found");
    return db.supplierBill.update({ where: { id: existing.id }, data });
  }
  return db.supplierBill.create({ data: { organizationId, ...data, status: "open" } });
}

export async function markBillPaid(organizationId: string, id: string, paid: boolean) {
  const bill = await db.supplierBill.findFirst({ where: { id, organizationId } });
  if (!bill) throw new Error("That bill was not found");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  return db.supplierBill.update({
    where: { id },
    data: paid ? { status: "paid", paidOn: today } : { status: "open", paidOn: null },
  });
}
