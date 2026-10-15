import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recordMovement, StockError, toStockItem } from "@/lib/modules/stock";

const signatureSchema = z.string().startsWith("data:image/").max(500_000);

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.stockItem.findUnique({
    where: { publicToken: token },
    include: {
      organization: { include: { branding: true } },
      movements: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const view = toStockItem(item, true);
  return NextResponse.json({
    item: view,
    companyName: item.organization.branding?.displayName ?? item.organization.name,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const item = await db.stockItem.findUnique({ where: { publicToken: token } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = z.object({
      kind: z.enum(["issue", "return"]),
      quantity: z.number().int().positive().max(100_000),
      partyName: z.string().trim().min(2).max(120),
      partySignature: signatureSchema,
      loggedByName: z.string().trim().min(2).max(120),
      loggedBySignature: signatureSchema,
      jobRef: z.string().trim().max(120).optional(),
      note: z.string().trim().max(2000).optional(),
    }).parse(await req.json());

    await recordMovement({
      organizationId: item.organizationId,
      itemId: item.id,
      kind: body.kind,
      quantity: body.quantity,
      partyName: body.partyName,
      partySignature: body.partySignature,
      loggedByName: body.loggedByName,
      loggedBySignature: body.loggedBySignature,
      jobRef: body.jobRef,
      note: body.note,
    });

    const updated = await db.stockItem.findFirstOrThrow({
      where: { id: item.id },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 12 } },
    });
    return NextResponse.json({ item: toStockItem(updated, true) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the stock fields and try again." }, { status: 400 });
    }
    if (error instanceof StockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
