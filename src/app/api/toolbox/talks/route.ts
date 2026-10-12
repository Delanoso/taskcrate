import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessContext, canAccessProduct } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccessContext(session);
  if (!canAccessProduct(access, "toolbox-talks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const talks = await db.toolboxTalk.findMany({
    where: { organizationId: session.organizationId },
    include: { _count: { select: { attendances: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ talks });
}

const createSchema = z.object({
  title: z.string().min(2),
  weekLabel: z.string().min(1),
  content: z.string().min(10),
  mediaUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccessContext(session);
  if (!canAccessProduct(access, "toolbox-talks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const talk = await db.toolboxTalk.create({
    data: {
      organizationId: session.organizationId,
      title: body.title,
      weekLabel: body.weekLabel,
      content: body.content,
      mediaUrl: body.mediaUrl || null,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({
    talk,
    publicUrl: `${appUrl}/t/${talk.publicToken}`,
  });
}
