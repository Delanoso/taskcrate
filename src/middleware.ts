import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { HOST_SESSION_COOKIE, LEGACY_SESSION_COOKIE } from "@/lib/session-cookies";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Empty strings must not win over a valid __Host- cookie (Safari dual-cookie residue).
  const legacy = req.cookies.get(LEGACY_SESSION_COOKIE)?.value;
  const host = req.cookies.get(HOST_SESSION_COOKIE)?.value;
  const token =
    legacy && legacy.length > 0 ? legacy : host && host.length > 0 ? host : undefined;

  const key = secretKey();
  if (!token || !key) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  try {
    await jwtVerify(token, key);
    const res = NextResponse.next();
    res.headers.set("x-delano-session", "ok");
    return res;
  } catch {
    // Redirect only — do not Set-Cookie Max-Age=0 here. Clearing in middleware
    // races the login redirect and wipes a freshly issued session in Safari/Chrome.
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
