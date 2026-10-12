import { NextResponse } from "next/server";
import { z } from "zod";
import { createCipheriv, randomBytes, scryptSync } from "crypto";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";

function encryptBank(json: string) {
  const key = scryptSync(process.env.SESSION_SECRET ?? "dev", "bank-salt", 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.onboardingPacket.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    packet: {
      employeeName: item.employeeName,
      status: item.status,
      companyName: item.organization.branding?.displayName ?? item.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await db.onboardingPacket.findUnique({ where: { publicToken: token } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    idDocDataUrl: z.string().startsWith("data:"),
    addressDocDataUrl: z.string().startsWith("data:"),
    bank: z.object({
      bankName: z.string().min(2),
      accountName: z.string().min(2),
      accountNumber: z.string().min(5),
      branchCode: z.string().min(2),
    }),
  }).parse(await req.json());
  const folder = `onboard/${item.organizationId}`;
  const idDocUrl = await saveDataUrlUpload(
    body.idDocDataUrl.startsWith("data:image/") ? body.idDocDataUrl : body.idDocDataUrl.replace(/^data:[^;]+/, "data:image/jpeg"),
    folder,
  ).catch(() => "/uploads/placeholder-id");
  const addressDocUrl = await saveDataUrlUpload(
    body.addressDocDataUrl.startsWith("data:image/") ? body.addressDocDataUrl : body.addressDocDataUrl.replace(/^data:[^;]+/, "data:image/jpeg"),
    folder,
  ).catch(() => "/uploads/placeholder-address");
  await db.onboardingPacket.update({
    where: { id: item.id },
    data: {
      idDocUrl,
      addressDocUrl,
      bankJson: encryptBank(JSON.stringify(body.bank)),
      status: "completed",
    },
  });
  return NextResponse.json({ ok: true });
}
