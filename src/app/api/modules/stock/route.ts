import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { simpleBrandedPdf } from "@/lib/modules/pdf-simple";
import { recordMovement, StockError, toStockItem } from "@/lib/modules/stock";
import { STOCK_UNITS } from "@/lib/modules/stock-shared";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);

const moveSchema = z.object({
  action: z.literal("move"),
  itemId: z.string(),
  kind: z.enum(["issue", "receive", "return", "adjust"]),
  quantity: z.number().int().positive().max(100_000).optional(),
  counted: z.number().int().min(0).max(100_000).optional(),
  partyName: z.string().trim().min(2).max(120),
  partySignature: signatureSchema.optional(),
  loggedByName: z.string().trim().min(2).max(120),
  loggedBySignature: signatureSchema,
  jobRef: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(2000).optional(),
});

function badRequest(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Check the stock fields and try again." }, { status: 400 });
  }
  if (error instanceof StockError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  throw error;
}

async function loggerName(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { fullName: true } });
  return user?.fullName ?? "";
}

export async function GET(req: Request) {
  const gate = await requireProductApi("workshop-consumables");
  if ("error" in gate) return gate.error;
  const id = new URL(req.url).searchParams.get("id");
  const name = await loggerName(gate.session.userId);

  if (id) {
    const item = await db.stockItem.findFirst({
      where: { id, organizationId: gate.session.organizationId },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 80 } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: toStockItem(item, true), loggerName: name });
  }

  const items = await db.stockItem.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { name: "asc" },
  });
  const views = items.map((item) => toStockItem(item));
  return NextResponse.json({
    items: views,
    shortages: views.filter((item) => item.low),
    loggerName: name,
  });
}

export async function POST(req: Request) {
  try {
    const gate = await requireProductApi("workshop-consumables");
    if ("error" in gate) return gate.error;
    const body = z.discriminatedUnion("action", [
      z.object({
        action: z.literal("create"),
        name: z.string().trim().min(2).max(120),
        sku: z.string().trim().max(40).optional(),
        unit: z.enum(STOCK_UNITS).optional(),
        location: z.string().trim().max(120).optional(),
        supplier: z.string().trim().max(120).optional(),
        quantity: z.number().int().min(0).max(100_000),
        reorderAt: z.number().int().min(0).max(100_000),
        loggedByName: z.string().trim().max(120).optional(),
        loggedBySignature: signatureSchema.optional(),
      }),
      z.object({
        action: z.literal("details"),
        itemId: z.string(),
        name: z.string().trim().min(2).max(120),
        sku: z.string().trim().max(40).nullable().optional(),
        unit: z.enum(STOCK_UNITS),
        location: z.string().trim().max(120).nullable().optional(),
        supplier: z.string().trim().max(120).nullable().optional(),
        reorderAt: z.number().int().min(0).max(100_000),
      }),
      moveSchema,
      z.object({ action: z.literal("requisition") }),
    ]).parse(await req.json());

    if (body.action === "create") {
      const sku = body.sku?.trim() || null;
      if (sku) {
        const taken = await db.stockItem.findFirst({
          where: { organizationId: gate.session.organizationId, sku },
        });
        if (taken) return NextResponse.json({ error: "That stock code is already used." }, { status: 400 });
      }
      if (body.quantity > 0 && (!body.loggedByName?.trim() || !body.loggedBySignature)) {
        return NextResponse.json({ error: "The person who counted the opening stock must sign." }, { status: 400 });
      }

      const created = await db.stockItem.create({
        data: {
          organizationId: gate.session.organizationId,
          name: body.name.trim(),
          sku,
          unit: body.unit ?? "each",
          location: body.location?.trim() || null,
          supplier: body.supplier?.trim() || null,
          quantity: 0,
          reorderAt: body.reorderAt,
        },
      });

      if (body.quantity > 0) {
        try {
          await recordMovement({
            organizationId: gate.session.organizationId,
            itemId: created.id,
            kind: "receive",
            quantity: body.quantity,
            partyName: body.loggedByName!.trim(),
            loggedByName: body.loggedByName!.trim(),
            loggedBySignature: body.loggedBySignature!,
            note: "Opening balance",
            opening: true,
          });
        } catch (error) {
          await db.stockItem.delete({ where: { id: created.id } }).catch(() => undefined);
          throw error;
        }
      }

      const item = await db.stockItem.findFirstOrThrow({
        where: { id: created.id },
        include: { movements: { orderBy: { createdAt: "desc" } } },
      });
      return NextResponse.json({ item: toStockItem(item, true) });
    }

    if (body.action === "details") {
      const existing = await db.stockItem.findFirst({
        where: { id: body.itemId, organizationId: gate.session.organizationId },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const sku = body.sku?.trim() || null;
      if (sku) {
        const taken = await db.stockItem.findFirst({
          where: { organizationId: gate.session.organizationId, sku, NOT: { id: existing.id } },
        });
        if (taken) return NextResponse.json({ error: "That stock code is already used." }, { status: 400 });
      }
      const item = await db.stockItem.update({
        where: { id: existing.id },
        data: {
          name: body.name.trim(),
          sku,
          unit: body.unit,
          location: body.location?.trim() || null,
          supplier: body.supplier?.trim() || null,
          reorderAt: body.reorderAt,
        },
        include: { movements: { orderBy: { createdAt: "desc" }, take: 80 } },
      });
      return NextResponse.json({ item: toStockItem(item, true) });
    }

    if (body.action === "move") {
      const existing = await db.stockItem.findFirst({
        where: { id: body.itemId, organizationId: gate.session.organizationId },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await recordMovement({
        organizationId: gate.session.organizationId,
        itemId: existing.id,
        kind: body.kind,
        quantity: body.quantity,
        counted: body.counted,
        partyName: body.partyName,
        partySignature: body.partySignature,
        loggedByName: body.loggedByName,
        loggedBySignature: body.loggedBySignature,
        jobRef: body.jobRef,
        note: body.note,
        reason: body.reason,
      });
      const item = await db.stockItem.findFirstOrThrow({
        where: { id: existing.id },
        include: { movements: { orderBy: { createdAt: "desc" }, take: 80 } },
      });
      return NextResponse.json({ item: toStockItem(item, true) });
    }

    const shortages = await db.stockItem.findMany({
      where: { organizationId: gate.session.organizationId },
      orderBy: { name: "asc" },
    });
    const lines = shortages
      .filter((item) => item.quantity <= item.reorderAt)
      .map((item) => {
        const buy = Math.max(item.reorderAt * 2 - item.quantity, item.reorderAt);
        const place = [item.sku, item.location].filter(Boolean).join(", ");
        return `${item.name}${place ? ` (${place})` : ""}: ${item.quantity} ${item.unit} on hand, reorder at ${item.reorderAt}, order ${buy} ${item.unit}`;
      });
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
  } catch (error) {
    return badRequest(error);
  }
}
