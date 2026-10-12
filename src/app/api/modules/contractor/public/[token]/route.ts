import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.contractorProfile.findUnique({
    where: { publicToken: token },
    include: { documents: true, organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    contractor: {
      companyName: item.companyName,
      status: item.status,
      documents: item.documents,
      hostCompany: item.organization.branding?.displayName ?? item.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.contractorProfile.findUnique({ where: { publicToken: token } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    docType: z.enum(["coida", "liability", "medical"]),
    fileDataUrl: z.string().startsWith("data:"),
    expiresAt: z.string().optional(),
  }).parse(await req.json());
  const fileUrl = await saveDataUrlUpload(body.fileDataUrl.includes("image/") ? body.fileDataUrl : body.fileDataUrl.replace(/^data:[^;]+/, "data:image/png"), `contractor/${item.organizationId}`).catch(async () => {
    // allow non-image PDFs stored as generic base64 text file
    const match = /^data:([^;]+);base64,(.+)$/.exec(body.fileDataUrl);
    if (!match) throw new Error("bad file");
    const { mkdir, writeFile } = await import("fs/promises");
    const path = await import("path");
    const { randomBytes } = await import("crypto");
    const dir = path.join(process.cwd(), "public", "uploads", `contractor/${item.organizationId}`);
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}.bin`;
    await writeFile(path.join(dir, name), Buffer.from(match[2], "base64"));
    return `/uploads/contractor/${item.organizationId}/${name}`;
  });
  await db.contractorDocument.create({
    data: {
      contractorId: item.id,
      docType: body.docType,
      fileUrl,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });
  const docs = await db.contractorDocument.findMany({ where: { contractorId: item.id } });
  const now = new Date();
  const required = ["coida", "liability", "medical"];
  const ok = required.every((t) => {
    const d = docs.find((x) => x.docType === t);
    return d && (!d.expiresAt || d.expiresAt >= now);
  });
  await db.contractorProfile.update({
    where: { id: item.id },
    data: { status: ok ? "active" : "pending" },
  });
  if (body.expiresAt) {
    await db.notification.create({
      data: {
        organizationId: item.organizationId,
        productSlug: "contractor-safety-file",
        title: "Contractor document expiry tracked",
        body: `${item.companyName} uploaded ${body.docType} expiring ${body.expiresAt}`,
        dueAt: new Date(body.expiresAt),
      },
    });
  }
  return NextResponse.json({ ok: true });
}
