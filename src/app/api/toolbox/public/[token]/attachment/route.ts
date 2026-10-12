import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readTalkAttachment } from "@/lib/toolbox-attachments";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const talk = await db.toolboxTalk.findUnique({
    where: { publicToken: token },
    select: { status: true, attachmentUrl: true, attachmentName: true, attachmentType: true },
  });
  if (!talk || talk.status !== "open" || !talk.attachmentUrl || !talk.attachmentType) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const bytes = await readTalkAttachment(talk.attachmentUrl);
    const name = (talk.attachmentName ?? "attachment").replace(/"/g, "");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": talk.attachmentType,
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
