import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonList, managersOnly, notFound, parseBody, photoSchema, removeUpload, staffName } from "@/lib/modules/common";
import { CONDITIONS } from "@/lib/modules/equipment-options";
import { FOLDER, itemInput, logEvent, requireEquipmentApi, serializeIssue, serializeItem, serializeLog } from "@/lib/modules/equipment-server";
import { saveDataUrlUpload } from "@/lib/uploads";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string, orgId: string) {
  return db.equipmentItem.findFirst({ where: { id, organizationId: orgId } });
}

async function detail(id: string) {
  const [item, issues, logs] = await Promise.all([
    db.equipmentItem.findUniqueOrThrow({ where: { id } }),
    db.equipmentIssue.findMany({ where: { itemId: id }, orderBy: { createdAt: "desc" } }),
    db.equipmentCustodyLog.findMany({ where: { itemId: id }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  return { item: serializeItem(item), issues: issues.map((x) => serializeIssue(x)), logs: logs.map(serializeLog) };
}

export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const item = await load((await params).id, gate.session.organizationId);
  if (!item) return notFound();
  return NextResponse.json(await detail(item.id));
}

const conditionKey = z.enum(CONDITIONS.map((c) => c.key) as [string, ...string[]]);
const patchInput = z.discriminatedUnion("action", [
  itemInput.extend({ action: z.literal("update"), photo: photoSchema.nullable().optional(), removePhoto: z.boolean().optional() }),
  z.object({ action: z.literal("set_status"), status: z.enum(["available", "repair", "lost", "retired"]), note: z.string().trim().max(500).optional() }),
  z.object({
    action: z.literal("repair_done"),
    condition: conditionKey,
    cost: z.number().min(0).max(10_000_000).nullable().optional(),
    note: z.string().trim().max(500).optional(),
    retire: z.boolean().optional(),
  }),
]);

export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const item = await load((await params).id, orgId);
  if (!item) return notFound();
  const body = await parseBody(req, patchInput);
  if ("error" in body) return body.error;
  const b = body.data;
  const by = await staffName(gate.session.userId);

  if (b.action === "update") {
    const { photo, removePhoto } = b;
    const data = { name: b.name, assetTag: b.assetTag, category: b.category, serialNumber: b.serialNumber, value: b.value, condition: b.condition, location: b.location, notes: b.notes };
    if (data.assetTag && data.assetTag.toLowerCase() !== item.assetTag?.toLowerCase()) {
      const clash = await db.equipmentItem.findFirst({ where: { organizationId: orgId, assetTag: data.assetTag, id: { not: item.id } } });
      if (clash) return NextResponse.json({ error: `Asset tag ${data.assetTag} is already used by ${clash.name}.` }, { status: 409 });
    }
    let photoUrl = item.photoUrl;
    if ((photo || removePhoto) && item.photoUrl) {
      await removeUpload(item.photoUrl, FOLDER, orgId);
      photoUrl = null;
    }
    if (photo) photoUrl = await saveDataUrlUpload(photo, `${FOLDER}/${orgId}`);
    await db.equipmentItem.update({
      where: { id: item.id },
      data: { ...data, assetTag: data.assetTag ?? item.assetTag, value: data.value ?? null, photoUrl },
    });
    await logEvent({ organizationId: orgId, itemId: item.id, employeeName: "", action: "edited", by });
    return NextResponse.json(await detail(item.id));
  }

  const open = await db.equipmentIssue.findFirst({ where: { itemId: item.id, status: { in: ["awaiting_signature", "active"] } } });
  if (open) return NextResponse.json({ error: `This item is signed out to ${open.employeeName}. Check it in through Handback first.` }, { status: 409 });

  if (b.action === "set_status") {
    if (b.status === "retired" || b.status === "lost") {
      const denied = managersOnly(gate.access, "write off equipment");
      if (denied) return denied;
    }
    await db.equipmentItem.update({ where: { id: item.id }, data: { status: b.status } });
    await logEvent({ organizationId: orgId, itemId: item.id, employeeName: "", action: `status_${b.status}`, by, note: b.note || null });
    return NextResponse.json(await detail(item.id));
  }

  if (item.status !== "repair") return NextResponse.json({ error: "This item is not in repair." }, { status: 409 });
  if (b.retire) {
    const denied = managersOnly(gate.access, "write off equipment");
    if (denied) return denied;
  }
  await db.equipmentItem.update({ where: { id: item.id }, data: { status: b.retire ? "retired" : "available", condition: b.condition } });
  const note = [b.note, b.cost ? `Repair cost R ${b.cost.toFixed(2)}` : null].filter(Boolean).join(" - ");
  await logEvent({ organizationId: orgId, itemId: item.id, employeeName: "", action: b.retire ? "repair_failed" : "repair_done", by, note: note || null });
  return NextResponse.json(await detail(item.id));
}

/** Only items that were never signed out can be deleted; the rest keep their history and are written off instead. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "delete equipment");
  if (denied) return denied;
  const orgId = gate.session.organizationId;
  const item = await load((await params).id, orgId);
  if (!item) return notFound();
  const used = await db.equipmentIssue.count({ where: { itemId: item.id, status: { not: "cancelled" } } });
  if (used) return NextResponse.json({ error: "This item has custody history. Write it off instead of deleting it." }, { status: 409 });
  const cancelled = await db.equipmentIssue.findMany({ where: { itemId: item.id } });
  for (const x of cancelled) {
    for (const u of [x.signatureUrl, x.returnSignatureUrl, x.inspectorSignature, ...jsonList(x.photosJson)]) if (u) await removeUpload(u, FOLDER, orgId);
  }
  if (item.photoUrl) await removeUpload(item.photoUrl, FOLDER, orgId);
  await db.equipmentCustodyLog.deleteMany({ where: { itemId: item.id } });
  await db.equipmentItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
