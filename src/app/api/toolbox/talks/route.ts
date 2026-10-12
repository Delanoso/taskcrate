import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessContext, canAccessProduct } from "@/lib/rbac";
import type { Prisma } from "@/generated/prisma/client";
import { findLibraryTalk, talkToPlainText } from "@/data/toolbox-library";
import { saveTalkAttachment } from "@/lib/toolbox-attachments";

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

const librarySchema = z.object({
  librarySlug: z.string().min(1),
  weekLabel: z.string().trim().min(1, "Enter a week label."),
});

const customSchema = z.object({
  title: z.string().trim().min(2, "Enter a title."),
  weekLabel: z.string().trim().min(1, "Enter a week label."),
  content: z.string().trim(),
  mediaUrl: z.union([z.string().url("Video / media link must be a full URL."), z.literal("")]).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccessContext(session);
  if (!canAccessProduct(access, "toolbox-talks")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let data: Prisma.ToolboxTalkUncheckedCreateInput;
  try {
    const isForm = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
    if (!isForm) {
      const body = librarySchema.parse(await req.json());
      const lib = findLibraryTalk(body.librarySlug);
      if (!lib) return NextResponse.json({ error: "Unknown library talk" }, { status: 400 });
      data = {
        organizationId: session.organizationId,
        title: lib.title,
        weekLabel: body.weekLabel,
        content: talkToPlainText(lib),
        librarySlug: lib.slug,
      };
    } else {
      const fd = await req.formData();
      const body = customSchema.parse({
        title: fd.get("title") ?? "",
        weekLabel: fd.get("weekLabel") ?? "",
        content: fd.get("content") ?? "",
        mediaUrl: fd.get("mediaUrl") ?? "",
      });
      const file = fd.get("file");
      const hasFile = file instanceof File && file.size > 0;
      if (!hasFile && body.content.length < 10) {
        return NextResponse.json(
          { error: "Add the talk notes (at least 10 characters) or upload a file." },
          { status: 400 },
        );
      }
      data = {
        organizationId: session.organizationId,
        title: body.title,
        weekLabel: body.weekLabel,
        content: body.content,
        mediaUrl: body.mediaUrl || null,
      };
      if (hasFile) {
        const saved = await saveTalkAttachment(file, session.organizationId);
        data.attachmentUrl = saved.url;
        data.attachmentName = saved.name;
        data.attachmentType = saved.type;
      }
    }
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? "Invalid form")
        : err instanceof Error
          ? err.message
          : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const talk = await db.toolboxTalk.create({ data });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({
    talk,
    publicUrl: `${appUrl}/t/${talk.publicToken}`,
  });
}
