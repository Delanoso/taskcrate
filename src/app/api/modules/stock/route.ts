import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { simpleBrandedPdf } from "@/lib/modules/pdf-simple";

export async function GET() {
  const gate = await requireProductApi("workshop-consumables");
  if ("error" in gate) return gate.error;
  const items = await db.stockItem.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { movements: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { name: "asc" },
  });
  const shortages = items.filter((i) => i.quantity <= i.reorderAt);
  return NextResponse.json({ items, shortages });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("workshop-consumables");
  if ("error" in gate) return gate.error;
  const body = z.discriminatedUnion("action", [
    z.object({ action: z.literal("create"), name: z.string().min(2), quantity: z.number().int(), reorderAt: z.number().int().optional(), sku: z.string().optional() }),
    z.object({ action: z.literal("scan_out"), itemId: z.string(), qty: z.number().int().positive(), note: z.string().optional() }),
    z.object({ action: z.literal("requisition") }),
  ]).parse(await req.json());

  if (body.action === "create") {
    const item = await db.stockItem.create({
      data: {
        organizationId: gate.session.organizationId,
        name: body.name,
        quantity: body.quantity,
        reorderAt: body.reorderAt ?? 5,
        sku: body.sku,
      },
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
    return NextResponse.json({ item, publicUrl: `${appUrl}/p/stock/${item.publicToken}` });
  }

  if (body.action === "scan_out") {
    const item = await db.stockItem.findFirst({
      where: { id: body.itemId, organizationId: gate.session.organizationId },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await db.stockItem.update({
      where: { id: item.id },
      data: { quantity: Math.max(0, item.quantity - body.qty) },
    });
    await db.stockMovement.create({
      data: { itemId: item.id, delta: -body.qty, note: body.note },
    });
    if (updated.quantity <= updated.reorderAt) {
      await db.notification.create({
        data: {
          organizationId: gate.session.organizationId,
          productSlug: "workshop-consumables",
          title: "Reorder threshold breached",
          body: `${updated.name} now at ${updated.quantity} (reorder at ${updated.reorderAt})`,
        },
      });
    }
    return NextResponse.json({ item: updated });
  }

  const shortages = await db.stockItem.findMany({
    where: { organizationId: gate.session.organizationId },
  });
  const lines = shortages
    .filter((i) => i.quantity <= i.reorderAt)
    .map((i) => `${i.name}: on hand ${i.quantity}, reorder at ${i.reorderAt}, suggest buy ${Math.max(i.reorderAt * 2 - i.quantity, i.reorderAt)}`);
  const pdf = await simpleBrandedPdf({
    organizationId: gate.session.organizationId,
    title: "Workshop Consumable Requisition",
    prefix: "REQ",
    lines: lines.length ? lines : ["No shortages."],
  });
  return NextResponse.json({
    documentNumber: pdf.documentNumber,
    pdfBase64: Buffer.from(pdf.bytes).toString("base64"),
    count: lines.length,
  });
}
