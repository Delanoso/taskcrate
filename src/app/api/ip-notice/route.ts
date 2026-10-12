import { NextResponse } from "next/server";
import { z } from "zod";
import { IP_NOTICE_VERSION } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const schema = z.object({ productSlug: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productSlug } = schema.parse(await req.json());

  await db.ipNoticeAcknowledgement.upsert({
    where: {
      userId_productSlug_version: {
        userId: session.userId,
        productSlug,
        version: IP_NOTICE_VERSION,
      },
    },
    create: {
      userId: session.userId,
      productSlug,
      version: IP_NOTICE_VERSION,
    },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
