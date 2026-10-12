import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { saveDataUrlUpload } from "@/lib/uploads";

async function requireEquipmentAccess() {
  const issuer = await requireProductApi("equipment-issuer");
  if (!("error" in issuer)) return issuer;
  return requireProductApi("equipment-handback");
}

export async function GET() {
  const gate = await requireEquipmentAccess();
  if ("error" in gate) return gate.error;
  const [items, logs] = await Promise.all([
    db.equipmentItem.findMany({ where: { organizationId: gate.session.organizationId } }),
    db.equipmentCustodyLog.findMany({
      where: { organizationId: gate.session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  return NextResponse.json({ items, logs });
}

export async function POST(req: Request) {
  const gate = await requireEquipmentAccess();
  if ("error" in gate) return gate.error;
  const body = z.discriminatedUnion("action", [
    z.object({ action: z.literal("create_item"), name: z.string().min(2), assetTag: z.string().optional() }),
    z.object({
      action: z.literal("issue"),
      itemId: z.string(),
      employeeName: z.string().min(2),
      signatureData: z.string().startsWith("data:image/"),
    }),
    z.object({
      action: z.literal("handback"),
      itemId: z.string(),
      employeeName: z.string().min(2),
      conditionNotes: z.string().optional(),
      damagePhotoDataUrl: z.string().startsWith("data:image/").optional(),
      signatureData: z.string().startsWith("data:image/").optional(),
    }),
  ]).parse(await req.json());

  if (body.action === "create_item") {
    const item = await db.equipmentItem.create({
      data: {
        organizationId: gate.session.organizationId,
        name: body.name,
        assetTag: body.assetTag,
      },
    });
    return NextResponse.json({ item });
  }

  const item = await db.equipmentItem.findFirst({
    where: { id: body.itemId, organizationId: gate.session.organizationId },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (body.action === "issue") {
    const log = await db.equipmentCustodyLog.create({
      data: {
        organizationId: gate.session.organizationId,
        itemId: item.id,
        employeeName: body.employeeName,
        action: "issue",
        signatureData: body.signatureData,
      },
    });
    await db.equipmentItem.update({ where: { id: item.id }, data: { status: "issued" } });
    return NextResponse.json({ log });
  }

  let damagePhotoUrl: string | undefined;
  if (body.damagePhotoDataUrl) {
    damagePhotoUrl = await saveDataUrlUpload(body.damagePhotoDataUrl, `equipment/${gate.session.organizationId}`);
  }
  const log = await db.equipmentCustodyLog.create({
    data: {
      organizationId: gate.session.organizationId,
      itemId: item.id,
      employeeName: body.employeeName,
      action: "handback",
      conditionNotes: body.conditionNotes,
      damagePhotoUrl,
      signatureData: body.signatureData,
    },
  });
  await db.equipmentItem.update({ where: { id: item.id }, data: { status: "available" } });
  return NextResponse.json({ log });
}
