import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseRequirements, resolveItem } from "@/lib/modules/safety-file-items";
import { documentSelect, safetyFileView } from "@/lib/modules/safety-file-server";
import { saveSafetyFileDocument } from "@/lib/safety-file-storage";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.contractorProfile.findUnique({
    where: { publicToken: token },
    include: { documents: { select: documentSelect }, organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    contractor: {
      companyName: item.companyName,
      hostCompany: item.organization.branding?.displayName ?? item.organization.name,
      ...(await safetyFileView(item)),
    },
  });
}

/** One file per request (multipart: docType, file, expiresAt?) so each stays under the upload limit. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = await db.contractorProfile.findUnique({ where: { publicToken: token } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload failed — please try again." }, { status: 400 });
  }
  const docType = String(fd.get("docType") ?? "");
  const file = fd.get("file");
  const expiresRaw = String(fd.get("expiresAt") ?? "").trim();

  if (!parseRequirements(profile.requirementsJson).includes(docType)) {
    return NextResponse.json({ error: "This document is not on your required list." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  const item = resolveItem(docType);
  let expiresAt: Date | null = null;
  if (expiresRaw) {
    expiresAt = new Date(`${expiresRaw}T23:59:59+02:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresRaw) || Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: "Enter a valid expiry date." }, { status: 400 });
    }
  } else if (item.expires) {
    return NextResponse.json({ error: `Enter the expiry date for ${item.label}.` }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveSafetyFileDocument(file, profile.organizationId);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
  }

  const doc = await db.contractorDocument.create({
    data: { contractorId: profile.id, docType, expiresAt, ...saved },
    select: documentSelect,
  });

  if (expiresAt) {
    await db.notification.create({
      data: {
        organizationId: profile.organizationId,
        productSlug: "contractor-safety-file",
        title: `${profile.companyName}: ${item.label} expires`,
        body: `${profile.companyName} uploaded ${item.label} expiring ${expiresRaw}.`,
        dueAt: expiresAt,
      },
    });
  }

  const fresh = await db.contractorProfile.findUniqueOrThrow({
    where: { id: profile.id },
    include: { documents: { select: documentSelect } },
  });
  const view = await safetyFileView(fresh);
  return NextResponse.json({ ok: true, document: doc, status: view.status });
}
