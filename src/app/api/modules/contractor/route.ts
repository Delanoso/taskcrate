import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

async function refreshStatus(contractorId: string) {
  const docs = await db.contractorDocument.findMany({ where: { contractorId } });
  const now = new Date();
  const required = ["coida", "liability", "medical"];
  const byType = Object.fromEntries(docs.map((d) => [d.docType, d]));
  let blocked = false;
  for (const t of required) {
    const d = byType[t];
    if (!d) { blocked = true; break; }
    if (d.expiresAt && d.expiresAt < now) { blocked = true; break; }
  }
  return db.contractorProfile.update({
    where: { id: contractorId },
    data: { status: blocked ? "blocked" : docs.length ? "active" : "pending" },
  });
}

export async function GET() {
  const gate = await requireProductApi("contractor-safety-file");
  if ("error" in gate) return gate.error;
  const items = await db.contractorProfile.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { documents: true },
    orderBy: { createdAt: "desc" },
  });
  for (const c of items) await refreshStatus(c.id);
  const refreshed = await db.contractorProfile.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { documents: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items: refreshed });
}

export async function POST(req: Request) {
  const gate = await requireProductApi("contractor-safety-file");
  if ("error" in gate) return gate.error;
  const body = z.object({
    companyName: z.string().min(2),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
  }).parse(await req.json());
  const item = await db.contractorProfile.create({
    data: {
      organizationId: gate.session.organizationId,
      companyName: body.companyName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/contractor/${item.publicToken}` });
}
