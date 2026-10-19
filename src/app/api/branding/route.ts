import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { removeUpload } from "@/lib/modules/common";
import { canManageTeam } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { saveDataUrlUpload } from "@/lib/uploads";

const schema = z.object({
  displayName: z.string().trim().min(2, "Add the company name").max(120),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logo: z.string().regex(/^data:image\/(png|jpeg);base64,/, "The logo must be a PNG or JPG").max(2_000_000, "The logo is too large").nullable().optional(),
  logoUrl: z.union([z.string().url(), z.literal("")]).optional(),
  removeLogo: z.boolean().optional(),
});

/** PDFs embed the logo from disk, so a web address is fetched once and stored like an upload. */
async function fetchLogo(url: string) {
  if (!/^https:\/\//i.test(url)) throw new Error("Use an https:// address for the logo");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "follow" });
  if (!res.ok) throw new Error("Could not download that logo");
  const type = res.headers.get("content-type") ?? "";
  if (!/image\/(png|jpeg|jpg)/.test(type)) throw new Error("The logo must be a PNG or JPG image");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 2_000_000) throw new Error("The logo is too large (max 2 MB)");
  return `data:${type.includes("png") ? "image/png" : "image/jpeg"};base64,${buf.toString("base64")}`;
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: session.userId, organizationId: session.organizationId } },
  });
  if (!membership || !canManageTeam(membership.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const body = parsed.data;
  const orgId = session.organizationId;
  const current = await db.organizationBranding.findUnique({ where: { organizationId: orgId } });

  let logoUrl = current?.logoUrl ?? null;
  let incoming = body.logo ?? null;
  if (!incoming && body.logoUrl && body.logoUrl !== current?.logoUrl) {
    try {
      incoming = await fetchLogo(body.logoUrl);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not use that logo" }, { status: 400 });
    }
  }
  if (incoming || body.removeLogo) {
    if (logoUrl) await removeUpload(logoUrl, "branding", orgId);
    logoUrl = incoming ? await saveDataUrlUpload(incoming, `branding/${orgId}`) : null;
  }

  await db.organizationBranding.update({
    where: { organizationId: orgId },
    data: { displayName: body.displayName, primaryColor: body.primaryColor, accentColor: body.accentColor, logoUrl },
  });
  return NextResponse.json({ ok: true, logoUrl });
}
