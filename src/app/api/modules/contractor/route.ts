import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { OrgRole } from "@/generated/prisma/client";
import { requireProductApi } from "@/lib/modules/api-guard";
import { isValidRequirementKey } from "@/lib/modules/safety-file-items";
import { documentSelect, safetyFileView } from "@/lib/modules/safety-file-server";
import { removeSafetyFileDocument } from "@/lib/safety-file-storage";

const SLUG = "contractor-safety-file";

const requirementsSchema = z
  .array(z.string())
  .min(1, "Choose at least one document the contractor must submit.")
  .max(100)
  .refine((keys) => keys.every(isValidRequirementKey), "Unknown document type in the list.")
  .transform((keys) => [...new Set(keys)]);

const optionalText = z.string().trim().max(200).optional().transform((v) => v || null);

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const profiles = await db.contractorProfile.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { documents: { select: documentSelect } },
    orderBy: { createdAt: "desc" },
  });
  const items = await Promise.all(
    profiles.map(async (p) => ({
      id: p.id,
      companyName: p.companyName,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone,
      publicToken: p.publicToken,
      createdAt: p.createdAt,
      ...(await safetyFileView(p)),
    })),
  );
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const parsed = z
    .object({
      companyName: z.string().trim().min(2, "Enter the contractor's company name."),
      contactName: optionalText,
      contactEmail: z.union([z.string().trim().email("Enter a valid email address."), z.literal("")]).optional().transform((v) => v || null),
      contactPhone: optionalText,
      requirements: requirementsSchema,
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid form" }, { status: 400 });
  }
  const { requirements, ...body } = parsed.data;
  const item = await db.contractorProfile.create({
    data: {
      organizationId: gate.session.organizationId,
      ...body,
      requirementsJson: JSON.stringify(requirements),
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({ item, publicUrl: `${appUrl}/p/contractor/${item.publicToken}` });
}

export async function PATCH(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const parsed = z
    .object({ id: z.string().min(1), requirements: requirementsSchema })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const existing = await db.contractorProfile.findFirst({
    where: { id: parsed.data.id, organizationId: gate.session.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.contractorProfile.update({
    where: { id: existing.id },
    data: { requirementsJson: JSON.stringify(parsed.data.requirements) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  if (gate.access.role === OrgRole.MEMBER) {
    return NextResponse.json({ error: "Only owners, admins and managers can delete contractors." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  const existing = id
    ? await db.contractorProfile.findFirst({
        where: { id, organizationId: gate.session.organizationId },
        include: { documents: { select: { fileUrl: true } } },
      })
    : null;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.contractorProfile.delete({ where: { id: existing.id } });
  await Promise.all(existing.documents.map((d) => removeSafetyFileDocument(d.fileUrl)));
  return NextResponse.json({ ok: true });
}
