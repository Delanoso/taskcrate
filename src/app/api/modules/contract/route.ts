import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET() {
  const gate = await requireProductApi("contract-sentinel");
  if ("error" in gate) return gate.error;
  const items = await db.contractDocument.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("contract-sentinel");
  if ("error" in gate) return gate.error;
  const body = z.object({
    title: z.string().min(2),
    bodyText: z.string().min(20),
    employeeName: z.string().optional(),
    employeeContact: z.string().optional(),
  }).parse(await req.json());
  const item = await db.contractDocument.create({
    data: {
      organizationId: gate.session.organizationId,
      title: body.title,
      bodyText: body.bodyText,
      employeeName: body.employeeName,
      employeeContact: body.employeeContact,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/contract/${item.publicToken}` });
}
