import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { FIT_BUBBLES, FIT_LIFE_MS, scoreFit } from "@/lib/modules/fit-gate";

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
      bubbles: FIT_BUBBLES,
      lifeMs: FIT_LIFE_MS,
    },
  });
}

const pop = z.object({
  reactionMs: z.number().int().min(1).max(FIT_LIFE_MS).nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.fitForDutySite.findUnique({ where: { publicToken: token } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z
    .object({
      employeeName: z.string().trim().min(2).max(120),
      ppeConfirmed: z.boolean(),
      pops: z.array(pop).length(FIT_BUBBLES),
    })
    .parse(await req.json());

  const scored = scoreFit(body.ppeConfirmed, body.pops);
  const check = await db.fitForDutyCheck.create({
    data: {
      siteId: site.id,
      employeeName: body.employeeName,
      reactionMs: scored.reactionMs,
      ppeConfirmed: body.ppeConfirmed,
      status: scored.status,
    },
  });
  if (scored.status === "FAILED") {
    await db.notification.create({
      data: {
        organizationId: site.organizationId,
        productSlug: "fit-for-duty",
        title: "Fit-for-duty FAILED — manual check required",
        body: `${body.employeeName}: popped ${scored.hits}/${FIT_BUBBLES}, avg ${scored.reactionMs}ms, PPE=${body.ppeConfirmed}`,
      },
    });
  }
  return NextResponse.json({ ok: true, status: check.status, checkId: check.id, hits: scored.hits, misses: scored.misses });
}
