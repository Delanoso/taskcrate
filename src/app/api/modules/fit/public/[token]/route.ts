import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.fitForDutySite.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    site: {
      name: site.name,
      companyName: site.organization.branding?.displayName ?? site.organization.name,
      targetMs: 450,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.fitForDutySite.findUnique({ where: { publicToken: token } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z.object({
    employeeName: z.string().min(2),
    reactionMs: z.number().int().positive(),
    ppeConfirmed: z.boolean(),
  }).parse(await req.json());
  const baseline = 450;
  const failed = !body.ppeConfirmed || body.reactionMs > baseline * 1.35;
  const status = failed ? "FAILED" : "VERIFIED_READY";
  const check = await db.fitForDutyCheck.create({
    data: {
      siteId: site.id,
      employeeName: body.employeeName,
      reactionMs: body.reactionMs,
      ppeConfirmed: body.ppeConfirmed,
      status,
    },
  });
  if (failed) {
    await db.notification.create({
      data: {
        organizationId: site.organizationId,
        productSlug: "fit-for-duty",
        title: "Fit-for-duty FAILED — manual check required",
        body: `${body.employeeName}: reaction ${body.reactionMs}ms, PPE=${body.ppeConfirmed}`,
      },
    });
  }
  return NextResponse.json({ ok: true, status: check.status, checkId: check.id });
}
