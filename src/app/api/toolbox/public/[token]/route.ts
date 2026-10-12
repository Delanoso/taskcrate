import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const talk = await db.toolboxTalk.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      title: true,
      weekLabel: true,
      content: true,
      mediaUrl: true,
      status: true,
      organization: { select: { name: true, branding: true } },
    },
  });

  if (!talk || talk.status !== "open") {
    return NextResponse.json({ error: "This toolbox talk is closed or unavailable." }, { status: 404 });
  }

  return NextResponse.json({
    talk: {
      title: talk.title,
      weekLabel: talk.weekLabel,
      content: talk.content,
      mediaUrl: talk.mediaUrl,
      companyName: talk.organization.branding?.displayName ?? talk.organization.name,
    },
  });
}

const attendSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  signatureData: z.string().startsWith("data:image/"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const talk = await db.toolboxTalk.findUnique({
    where: { publicToken: token },
  });

  if (!talk || talk.status !== "open") {
    return NextResponse.json({ error: "This toolbox talk is closed." }, { status: 400 });
  }

  const body = attendSchema.parse(await req.json());
  const forwarded = req.headers.get("x-forwarded-for") ?? "unknown";
  const ipHash = createHash("sha256").update(forwarded).digest("hex").slice(0, 32);

  await db.toolboxAttendance.create({
    data: {
      talkId: talk.id,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      signatureData: body.signatureData,
      ipHash,
    },
  });

  return NextResponse.json({ ok: true });
}
