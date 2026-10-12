import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const item = await db.workPermit.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    item: {
      title: item.title,
      status: item.status,
      companyName: item.organization.branding?.displayName ?? item.organization.name,
    },
  });
}

const submitSchema = z.object({
  action: z.literal("submit"),
  contractorName: z.string().min(1),
  contractorPhone: z.string().min(5),
  workDetails: z.string().min(3),
  areaPhotoDataUrl: z.string().startsWith("data:image/"),
  equipmentPhotoDataUrl: z.string().startsWith("data:image/"),
});

const completeSchema = z.object({
  action: z.literal("complete"),
  completionPhotoDataUrl: z.string().startsWith("data:image/"),
  completionNotes: z.string().optional(),
  contractorName: z.string().optional(),
  contractorPhone: z.string().optional(),
  workDetails: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const item = await db.workPermit.findUnique({ where: { publicToken: token } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = (raw as { action?: string })?.action;
  const folder = `permits/${item.organizationId}`;

  try {
    if (action === "submit") {
      if (item.status !== "sent" && item.status !== "submitted") {
        return NextResponse.json(
          { error: `Permit is already ${item.status}.` },
          { status: 400 },
        );
      }
      const body = submitSchema.parse(raw);
      const areaPhotoUrl = await saveDataUrlUpload(body.areaPhotoDataUrl, folder);
      const equipmentPhotoUrl = await saveDataUrlUpload(body.equipmentPhotoDataUrl, folder);
      const updated = await db.workPermit.update({
        where: { id: item.id },
        data: {
          contractorName: body.contractorName,
          contractorPhone: body.contractorPhone,
          workDetails: body.workDetails,
          areaPhotoUrl,
          equipmentPhotoUrl,
          status: "submitted",
        },
      });
      await db.notification.create({
        data: {
          organizationId: item.organizationId,
          productSlug: "permit-to-work",
          title: "Permit submitted for approval",
          body: `${body.contractorName} submitted photos for “${item.title}”.`,
        },
      });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    if (action === "complete") {
      if (item.status !== "approved" && item.status !== "completed") {
        return NextResponse.json(
          { error: "Permit must be approved before completion upload." },
          { status: 400 },
        );
      }
      const body = completeSchema.parse(raw);
      const completionPhotoUrl = await saveDataUrlUpload(body.completionPhotoDataUrl, folder);
      const updated = await db.workPermit.update({
        where: { id: item.id },
        data: {
          completionPhotoUrl,
          completionNotes: body.completionNotes,
          status: "completed",
        },
      });
      await db.notification.create({
        data: {
          organizationId: item.organizationId,
          productSlug: "permit-to-work",
          title: "Permit ready to close",
          body: `${item.contractorName ?? "Contractor"} uploaded completion evidence for “${item.title}”.`,
        },
      });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.issues[0]?.message ?? "Invalid form data";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
