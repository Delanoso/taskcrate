import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildWhatsAppShareLink } from "@/lib/whatsapp";

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
    },
  });
}

const schema = z.object({
  fullName: z.string().min(2),
  registration: z.string().optional(),
  purpose: z.string().min(2),
  phone: z.string().min(8),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.visitorSite.findUnique({
    where: { publicToken: token },
    include: { organization: true },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = schema.parse(await req.json());
  const share = buildWhatsAppShareLink({
    organizationSlug: site.organization.slug,
    documentType: "site-visitor-protocol",
    documentId: site.id,
    recipientHint: body.fullName,
  });
  const message = [
    `Welcome to ${site.name}.`,
    "",
    "Site safety / security / estate protocols:",
    site.protocolText,
    "",
    `Archive ref: ${share.secureUrl}`,
  ].join("\n");
  const wa = `https://wa.me/${body.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  const visitor = await db.visitorCheckIn.create({
    data: {
      siteId: site.id,
      fullName: body.fullName,
      registration: body.registration,
      purpose: body.purpose,
      phone: body.phone,
      whatsappSent: true,
      deliveryLog: JSON.stringify({ at: new Date().toISOString(), waPreview: wa, message }),
    },
  });
  return NextResponse.json({ ok: true, visitorId: visitor.id, whatsAppUrl: wa });
}
