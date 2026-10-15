import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { FIT_BUBBLES, FIT_LIFE_MS, FIT_PPE, scoreFit } from "@/lib/modules/fit-gate";
import { saveDataUrlUpload } from "@/lib/uploads";

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
      location: site.location,
      companyName: site.organization.branding?.displayName ?? site.organization.name,
      bubbles: FIT_BUBBLES,
      lifeMs: FIT_LIFE_MS,
      ppe: FIT_PPE,
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
  const parsed = z
    .object({
      employeeName: z.string().trim().min(2).max(120),
      employeeNumber: z.string().trim().max(40).optional(),
      ppe: z.array(z.object({ key: z.string(), pass: z.boolean() })),
      note: z.string().max(1000).optional(),
      photo: z.string().startsWith("data:image/").max(1_500_000),
      signature: z.string().startsWith("data:image/").max(500_000),
      pops: z.array(pop).length(FIT_BUBBLES),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const answers: { key: string; label: string; pass: boolean }[] = [];
  for (const item of FIT_PPE) {
    const answer = body.ppe.find((row) => row.key === item.key);
    if (!answer) return NextResponse.json({ error: "Answer every PPE check." }, { status: 400 });
    answers.push({ key: item.key, label: item.label, pass: answer.pass });
  }
  const ppeConfirmed = answers.every((item) => item.pass);
  const scored = scoreFit(ppeConfirmed, body.pops);
  const [photoUrl, signatureUrl] = await Promise.all([
    saveDataUrlUpload(body.photo, `fit/${site.organizationId}`),
    saveDataUrlUpload(body.signature, `fit/${site.organizationId}`),
  ]);
  const check = await db.fitForDutyCheck.create({
    data: {
      siteId: site.id,
      employeeName: body.employeeName,
      employeeNumber: body.employeeNumber?.trim() || null,
      reactionMs: scored.reactionMs,
      ppeConfirmed,
      ppeJson: JSON.stringify(answers),
      photoUrl,
      signatureUrl,
      note: body.note?.trim() || null,
      status: scored.status,
    },
  });
  if (scored.status === "FAILED") {
    const failedPpe = answers.filter((item) => !item.pass).map((item) => item.label);
    await db.notification.create({
      data: {
        organizationId: site.organizationId,
        productSlug: "fit-for-duty",
        title: "Fit-for-duty not cleared",
        body: `${body.employeeName} at ${site.name}: popped ${scored.hits}/${FIT_BUBBLES}, average ${scored.reactionMs} ms${failedPpe.length ? `, PPE failed: ${failedPpe.join(", ")}` : ""}.`,
      },
    });
  }
  return NextResponse.json({
    ok: true,
    status: check.status,
    checkId: check.id,
    hits: scored.hits,
    misses: scored.misses,
    at: check.createdAt.toISOString(),
  });
}

