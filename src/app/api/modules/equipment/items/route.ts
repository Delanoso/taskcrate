import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, photoSchema, staffName } from "@/lib/modules/common";
import { FOLDER, itemInput, logEvent, requireEquipmentApi, serializeItem } from "@/lib/modules/equipment-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { saveDataUrlUpload } from "@/lib/uploads";

const createInput = z.object({
  items: z.array(itemInput.extend({ photo: photoSchema.nullable().optional() })).min(1, "Nothing to add").max(500, "Import at most 500 items at a time"),
});

/** Adds one item or an imported list. Blank asset tags get the next EQ- number. */
export async function POST(req: Request) {
  const gate = await requireEquipmentApi();
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const body = await parseBody(req, createInput);
  if ("error" in body) return body.error;

  const existing = await db.equipmentItem.findMany({ where: { organizationId: orgId, assetTag: { not: null } }, select: { assetTag: true } });
  const taken = new Set(existing.map((e) => e.assetTag!.toLowerCase()));
  for (const it of body.data.items) {
    if (!it.assetTag) continue;
    const t = it.assetTag.toLowerCase();
    if (taken.has(t)) return NextResponse.json({ error: `Asset tag ${it.assetTag} is already used.` }, { status: 409 });
    taken.add(t);
  }

  const by = await staffName(gate.session.userId);
  const created = [];
  for (const it of body.data.items) {
    const { photo, ...data } = it;
    let assetTag = data.assetTag;
    while (!assetTag) {
      const next = await nextDocumentNumber(orgId, "EQ");
      if (!taken.has(next.toLowerCase())) assetTag = next;
    }
    taken.add(assetTag.toLowerCase());
    const item = await db.equipmentItem.create({
      data: {
        ...data,
        assetTag,
        value: data.value ?? null,
        organizationId: orgId,
        photoUrl: photo ? await saveDataUrlUpload(photo, `${FOLDER}/${orgId}`) : null,
      },
    });
    await logEvent({ organizationId: orgId, itemId: item.id, employeeName: "", action: "added", by });
    created.push(serializeItem(item));
  }
  return NextResponse.json({ items: created });
}
