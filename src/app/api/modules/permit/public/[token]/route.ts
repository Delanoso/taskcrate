import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";
import { isHazardKey, isPpeKey } from "@/lib/modules/permit-options";

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
      documentNumber: item.documentNumber,
      issuerName: item.issuerName,
      specificLocation: item.specificLocation,
      startAt: item.startAt,
      expiresAt: item.expiresAt,
    },
  });
}

const dataImage = (msg: string) => z.string({ error: msg }).startsWith("data:image/", msg);

const submitSchema = z.object({
  action: z.literal("submit"),
  contractorName: z.string().trim().min(2, "Enter the permit receiver's name."),
  contractorPhone: z.string().trim().min(5, "Enter a valid phone number."),
  specificLocation: z.string().trim().min(3, "Enter the specific location."),
  equipmentId: z.string().trim().min(1, "Enter the equipment tag / asset number."),
  workDetails: z.string().trim().min(3, "Describe the task."),
  hazards: z
    .array(z.string().refine(isHazardKey, "Unknown hazard"))
    .min(1, "Select at least one hazard."),
  lotoConfirmed: z.literal(true, "Confirm energy isolation (LOTO)."),
  barricadesConfirmed: z.literal(true, "Confirm barricades and warning signs."),
  fireExtinguisherOk: z.literal(true, "Confirm the fire extinguisher is on standby."),
  ppe: z.array(z.string().refine(isPpeKey, "Unknown PPE item")).default([]),
  areaPhotoDataUrl: dataImage("Add a work area photo."),
  equipmentPhotoDataUrl: dataImage("Add a safety equipment photo."),
  receiverSignatureDataUrl: dataImage("The receiver must sign before submitting."),
});

const completeSchema = z.object({
  action: z.literal("complete"),
  completionPhotoDataUrl: dataImage("Add a completion photo."),
  completionNotes: z.string().trim().min(3, "Add close-out notes."),
  receiverSignatureDataUrl: dataImage("The receiver must sign the close-out."),
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
      if (item.status !== "sent") {
        return NextResponse.json(
          { error: `Permit is already ${item.status}.` },
          { status: 400 },
        );
      }
      if (item.expiresAt && item.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "This permit has expired. Ask the issuer for a new permit." },
          { status: 400 },
        );
      }
      const body = submitSchema.parse(raw);
      const areaPhotoUrl = await saveDataUrlUpload(body.areaPhotoDataUrl, folder);
      const equipmentPhotoUrl = await saveDataUrlUpload(body.equipmentPhotoDataUrl, folder);
      const preWorkReceiverSigUrl = await saveDataUrlUpload(body.receiverSignatureDataUrl, folder);
      const updated = await db.workPermit.update({
        where: { id: item.id },
        data: {
          contractorName: body.contractorName,
          contractorPhone: body.contractorPhone,
          specificLocation: body.specificLocation,
          equipmentId: body.equipmentId,
          workDetails: body.workDetails,
          hazardsJson: JSON.stringify(body.hazards),
          lotoConfirmed: true,
          barricadesConfirmed: true,
          fireExtinguisherOk: true,
          ppeJson: JSON.stringify(body.ppe),
          areaPhotoUrl,
          equipmentPhotoUrl,
          preWorkReceiverSigUrl,
          preWorkReceiverSignedAt: new Date(),
          status: "submitted",
        },
      });
      await db.notification.create({
        data: {
          organizationId: item.organizationId,
          productSlug: "permit-to-work",
          title: "Permit submitted for approval",
          body: `${body.contractorName} signed and submitted “${item.title}” for issuer sign-off.`,
        },
      });
      return NextResponse.json({ ok: true, status: updated.status });
    }

    if (action === "complete") {
      if (item.status !== "approved") {
        return NextResponse.json(
          { error: "Permit must be approved before close-out." },
          { status: 400 },
        );
      }
      const body = completeSchema.parse(raw);
      const completionPhotoUrl = await saveDataUrlUpload(body.completionPhotoDataUrl, folder);
      const postWorkReceiverSigUrl = await saveDataUrlUpload(body.receiverSignatureDataUrl, folder);
      const updated = await db.workPermit.update({
        where: { id: item.id },
        data: {
          completionPhotoUrl,
          completionNotes: body.completionNotes,
          postWorkReceiverSigUrl,
          postWorkReceiverSignedAt: new Date(),
          status: "completed",
        },
      });
      await db.notification.create({
        data: {
          organizationId: item.organizationId,
          productSlug: "permit-to-work",
          title: "Permit ready to close",
          body: `${item.contractorName ?? "Receiver"} signed the close-out for “${item.title}”.`,
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
