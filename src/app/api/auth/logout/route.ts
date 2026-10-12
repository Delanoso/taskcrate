import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

function publicOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "taskcrate.co.za";
  const proto =
    (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]?.trim() ||
    (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/** POST only — GET must not clear the session (Next.js Link prefetches GET). */
export async function POST(req: Request) {
  await clearSession();
  const contentType = req.headers.get("content-type") ?? "";
  const isForm =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
  if (isForm) {
    return NextResponse.redirect(new URL("/login", publicOrigin(req)), 303);
  }
  return NextResponse.json({ ok: true });
}
