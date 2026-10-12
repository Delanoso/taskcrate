import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { saveDataUrlUpload } from "@/lib/uploads";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const board = await db.nearMissBoard.findUnique({
    where: { publicToken: token },
    include: { organization: { include: { branding: true } } },
  });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    companyName: board.organization.branding?.displayName ?? board.organization.name,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const board = await db.nearMissBoard.findUnique({ where: { publicToken: token } });
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = z
    .object({
      description: z.string().min(5),
      locationHint: z.string().optional(),
      photoDataUrl: z.string().startsWith("data:image/").optional(),
    })
    .parse(await req.json());
  let photoUrl: string | undefined;
  if (body.photoDataUrl) {
    photoUrl = await saveDataUrlUpload(body.photoDataUrl, `nearmiss/${board.organizationId}`);
  }
  const report = await db.nearMissReport.create({
    data: {
      organizationId: board.organizationId,
      description: body.description,
      locationHint: body.locationHint,
      photoUrl,
    },
  });
  await db.notification.create({
    data: {
      organizationId: board.organizationId,
      productSlug: "near-miss-whisperer",
      title: "Anonymous near-miss reported",
      body: body.description.slice(0, 140),
    },
  });
  return NextResponse.json({ ok: true, id: report.id });
}
