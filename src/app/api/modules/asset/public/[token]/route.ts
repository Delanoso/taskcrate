import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const asset = await db.asset.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    asset: {
      name: asset.name,
      assetCode: asset.assetCode,
      checklist: JSON.parse(asset.checklistJson) as string[],
      companyName: asset.organization.branding?.displayName ?? asset.organization.name,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const asset = await db.asset.findUnique({ where: { publicToken: token } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z
    .object({
      operatorName: z.string().min(2),
      answers: z.array(z.boolean()).length(5),
    })
    .parse(await req.json());
  if (body.answers.some((a) => !a)) {
    return NextResponse.json(
      { error: "All 5 checks must pass before an operational pass is issued." },
      { status: 400 },
    );
  }
  const check = await db.assetPreCheck.create({
    data: {
      assetId: asset.id,
      operatorName: body.operatorName,
      answersJson: JSON.stringify(body.answers),
    },
  });
  return NextResponse.json({ ok: true, passToken: check.passToken, shiftDate: check.shiftDate });
}
