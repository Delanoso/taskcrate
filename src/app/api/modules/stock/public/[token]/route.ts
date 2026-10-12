import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.stockItem.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    item: {
      name: item.name,
      quantity: item.quantity,
      companyName: item.organization.branding?.displayName ?? item.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.stockItem.findUnique({ where: { publicToken: token } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({ qty: z.number().int().positive(), note: z.string().optional() }).parse(await req.json());
  const updated = await db.stockItem.update({
    where: { id: item.id },
    data: { quantity: Math.max(0, item.quantity - body.qty) },
  });
  await db.stockMovement.create({ data: { itemId: item.id, delta: -body.qty, note: body.note } });
  return NextResponse.json({ ok: true, quantity: updated.quantity });
}
