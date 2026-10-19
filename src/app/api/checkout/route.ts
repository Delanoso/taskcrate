import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createCheckout, validApps } from "@/lib/payments";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { isCompanyAdmin } from "@/lib/rbac";
import { getSession } from "@/lib/session";

const schema = z.object({
  productSlug: z.string().optional(),
  apps: z.array(z.string()).max(40).optional(),
  allProducts: z.boolean().optional(),
  guest: z.boolean().optional(),
  email: z.string().email().optional(),
  fullName: z.string().trim().min(2).optional(),
  companyName: z.string().trim().min(2).optional(),
  acceptedTerms: z.boolean().optional(),
  sandbox: z.boolean().optional(),
});

/** Starts a PayFast checkout for one or more apps: pro-rata today, then a monthly debit on the 1st. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;
  if (body.allProducts) return NextResponse.json({ error: "Choose the apps you want to pay for." }, { status: 402 });

  const { apps, bad } = validApps(body.apps ?? (body.productSlug ? [body.productSlug] : []));
  if (bad.length) return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  if (!apps.length) return NextResponse.json({ error: "Choose at least one app." }, { status: 400 });

  const session = await getSession();
  if (body.guest && !session) {
    if (!body.email || !body.fullName || !body.companyName || !body.acceptedTerms) {
      return NextResponse.json({ error: "Name, email, company, and Terms acceptance are required." }, { status: 400 });
    }
    const r = await createCheckout({ organizationId: null, apps, email: body.email, fullName: body.fullName, companyName: body.companyName });
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 503 });
    return NextResponse.json({ ok: true, mode: "payfast", payfastHtml: r.html, reference: r.intent.reference });
  }

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user, org] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    db.organization.findUnique({ where: { id: session.organizationId } }),
  ]);
  if (!user || !org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const platformAdmin = isPlatformAdmin(user);
  if (!platformAdmin) {
    const membership = await db.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: org.id } } });
    if (!membership || !isCompanyAdmin(membership.role)) return NextResponse.json({ error: "Only an admin can pay for apps." }, { status: 403 });
  }
  if (body.sandbox && !platformAdmin) return NextResponse.json({ error: "Test payments are for the platform owner only." }, { status: 403 });

  const covered = await db.debitOrder.findMany({ where: { organizationId: org.id, status: "active" }, select: { appsJson: true } });
  const already = new Set(covered.flatMap((d) => JSON.parse(d.appsJson) as string[]));
  const dup = apps.filter((s) => already.has(s));
  if (dup.length && !body.sandbox) return NextResponse.json({ error: "Some of these apps already have a monthly debit order. Cancel it first or choose other apps." }, { status: 409 });

  const r = await createCheckout({
    organizationId: org.id,
    apps,
    email: user.email,
    fullName: user.fullName,
    companyName: org.name,
    createdBy: user.fullName,
    sandbox: body.sandbox,
  });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 503 });
  return NextResponse.json({ ok: true, mode: "payfast", payfastHtml: r.html, reference: r.intent.reference, today: r.quote.today, monthly: r.quote.monthly });
}
