import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { alertCompany } from "@/lib/email";
import { saveDataUrlUpload } from "@/lib/uploads";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.visitorSite.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    site: {
      name: site.name,
      companyName: site.organization.branding?.displayName ?? site.organization.name,
      protocolText: site.protocolText,
    },
  });
}

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  company: z.string().trim().max(160).optional(),
  hostName: z.string().trim().min(2, "Enter the name of the person you are visiting."),
  registration: z.string().optional(),
  purpose: z.string().trim().min(2, "Enter the purpose of your visit."),
  phone: z.string().refine((p) => p.replace(/\D/g, "").length >= 9, "Enter a valid WhatsApp number."),
  photo: z.string().startsWith("data:image/").max(1_500_000),
  signature: z.string().startsWith("data:image/").max(500_000),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.visitorSite.findUnique({ where: { publicToken: token } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid form" }, { status: 400 });
  }
  const body = parsed.data;
  const [photoUrl, signatureUrl] = await Promise.all([
    saveDataUrlUpload(body.photo, `visitor/${site.organizationId}`),
    saveDataUrlUpload(body.signature, `visitor/${site.organizationId}`),
  ]);

  const visitor = await db.visitorCheckIn.create({
    data: {
      siteId: site.id,
      fullName: body.fullName,
      company: body.company?.trim() || null,
      hostName: body.hostName.trim(),
      registration: body.registration || null,
      purpose: body.purpose,
      phone: body.phone,
      photoUrl,
      signatureUrl,
      whatsappSent: true,
    },
  });

  await alertCompany(site.organizationId, {
    productSlug: "site-visitor",
    title: `${body.fullName} signed in at ${site.name}`,
    body: `Visiting ${body.hostName}. ${body.purpose}`,
    kind: "visitor_in",
    subject: `Visitor: ${body.fullName} at ${site.name}`,
    lines: [`${body.fullName}${body.company ? ` from ${body.company}` : ""} is here to see ${body.hostName}.`, `Purpose: ${body.purpose}.`, "If they are still signed in tomorrow morning, this comes back on the list."],
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  const checkoutUrl = `${appUrl}/p/visitor/out/${visitor.checkoutToken}`;
  const message = [
    `Welcome to ${site.name}.`,
    "",
    "Site safety / security / estate protocols:",
    site.protocolText,
    "",
    "When you leave, tap this link to check out:",
    checkoutUrl,
  ].join("\n");
  const wa = `https://wa.me/${body.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  await db.visitorCheckIn.update({
    where: { id: visitor.id },
    data: { deliveryLog: JSON.stringify({ at: new Date().toISOString(), waPreview: wa, message }) },
  });

  return NextResponse.json({ ok: true, visitorId: visitor.id, whatsAppUrl: wa, checkoutUrl });
}
