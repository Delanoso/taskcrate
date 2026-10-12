import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.jobCard.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    job: {
      title: item.title,
      mode: item.mode,
      status: item.status,
      description: item.description,
      companyName: item.organization.branding?.displayName ?? item.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.jobCard.findUnique({ where: { publicToken: token } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    hoursWorked: z.number().optional(),
    partsJson: z.string().optional(),
    clientName: z.string().optional(),
    clientSignature: z.string().startsWith("data:image/").optional(),
    description: z.string().optional(),
    status: z.string().optional(),
  }).parse(await req.json());
  const updated = await db.jobCard.update({
    where: { id: item.id },
    data: {
      hoursWorked: body.hoursWorked,
      partsJson: body.partsJson,
      clientName: body.clientName,
      clientSignature: body.clientSignature,
      description: body.description ?? item.description,
      status: body.status ?? (body.clientSignature ? "done" : item.status),
    },
  });
  return NextResponse.json({ ok: true, status: updated.status });
}
