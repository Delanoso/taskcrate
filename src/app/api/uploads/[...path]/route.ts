import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".bin": "application/octet-stream",
};

/**
 * Uploads are written at runtime, which `next start` does not serve from /public.
 * Files live at <module>/<organizationId>/<file>; only that tenant may read them.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (segments.length < 3 || segments[1] !== session.organizationId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOAD_ROOT, ...segments);
  const type = MIME[path.extname(filePath).toLowerCase()];
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep) || !type) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": type,
        ...(type.startsWith("image/") ? {} : { "Content-Disposition": "attachment" }),
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
