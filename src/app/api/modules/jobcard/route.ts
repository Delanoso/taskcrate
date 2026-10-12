import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "field" ? "field" : "internal";
  const slug = mode === "field" ? "job-card-field" : "job-card-internal";
  const gate = await requireProductApi(slug);
  if ("error" in gate) return gate.error;
  const items = await db.jobCard.findMany({
    where: { organizationId: gate.session.organizationId, mode },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = z.object({
    mode: z.enum(["internal", "field"]),
    title: z.string().min(2),
    machineRef: z.string().optional(),
    description: z.string().optional(),
  }).parse(await req.json());
  const slug = body.mode === "field" ? "job-card-field" : "job-card-internal";
  const gate = await requireProductApi(slug);
  if ("error" in gate) return gate.error;
  const item = await db.jobCard.create({
    data: {
      organizationId: gate.session.organizationId,
      mode: body.mode,
      title: body.title,
      machineRef: body.machineRef,
      description: body.description,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/jobcard/${item.publicToken}` });
}

export async function PATCH(req: Request) {
  const body = z.object({
    id: z.string(),
    mode: z.enum(["internal", "field"]),
    status: z.string().optional(),
    mechanicName: z.string().optional(),
    downtimeHours: z.number().optional(),
    partsCost: z.number().optional(),
    partsJson: z.string().optional(),
    hoursWorked: z.number().optional(),
    clientName: z.string().optional(),
    clientSignature: z.string().optional(),
  }).parse(await req.json());
  const slug = body.mode === "field" ? "job-card-field" : "job-card-internal";
  const gate = await requireProductApi(slug);
  if ("error" in gate) return gate.error;
  const existing = await db.jobCard.findFirst({
    where: { id: body.id, organizationId: gate.session.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id, mode, ...data } = body;
  const item = await db.jobCard.update({ where: { id }, data });
  return NextResponse.json({ item });
}
