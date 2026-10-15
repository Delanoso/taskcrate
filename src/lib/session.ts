import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { LEGACY_SESSION_COOKIE as SESSION_COOKIE } from "@/lib/session-cookies";

export { HOST_SESSION_COOKIE, LEGACY_SESSION_COOKIE } from "@/lib/session-cookies";

export type SessionPayload = {
  userId: string;
  organizationId: string;
  email: string;
  /** Bumped when the password changes so older logins stop working. Missing means 0. */
  sv: number;
};

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function requestIsHttps() {
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  if (proto === "https") return true;
  if (proto === "http") return false;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  if (host.includes("sslip.io") || host.endsWith("taskcrate.co.za")) return true;
  return process.env.NODE_ENV === "production";
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (typeof payload.userId !== "string" || typeof payload.organizationId !== "string") return null;
    if (typeof payload.email !== "string") return null;
    const sv = typeof payload.sv === "number" ? payload.sv : 0;
    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      email: payload.email,
      sv,
    };
  } catch {
    return null;
  }
}

/** Single cookie only — multiple Set-Cookie clears confuse Safari. */
export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await requestIsHttps(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function attachSessionCookie(
  res: NextResponse,
  payload: SessionPayload,
  req?: Request,
) {
  const proto = (req?.headers.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  const host = (
    req?.headers.get("x-forwarded-host") ??
    req?.headers.get("host") ??
    ""
  ).toLowerCase();
  const secure =
    proto === "https" ||
    host.endsWith("taskcrate.co.za") ||
    host.includes("sslip.io") ||
    (process.env.NODE_ENV === "production" && proto !== "http");

  const token = await signSessionToken(payload);
  // Exactly one Set-Cookie — extra clears in the same response make Safari/Chrome drop the session.
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const v of values) {
    if (v && v.length > 0) return v;
  }
  return undefined;
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = firstNonEmpty(
    jar.get(SESSION_COOKIE)?.value,
    jar.get("__Host-delano_session")?.value,
  );
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { sessionVersion: true },
  });
  if (!user || user.sessionVersion !== payload.sv) return null;
  return payload;
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}
