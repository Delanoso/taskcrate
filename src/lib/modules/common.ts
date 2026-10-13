import { rm } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { OrgRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { AccessContext } from "@/lib/rbac";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
}

export async function companyName(organizationId: string) {
  const org = await db.organization.findUnique({ where: { id: organizationId }, include: { branding: true } });
  return org?.branding?.displayName ?? org?.name ?? "Your company";
}

export async function staffName(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { fullName: true } });
  return user?.fullName ?? "Staff";
}

/** Deletes a file saved by saveDataUrlUpload, only inside the tenant's own module folder. */
export async function removeUpload(url: string, folder: string, organizationId: string) {
  if (!url.startsWith(`/uploads/${folder}/${organizationId}/`)) return;
  const filePath = path.join(process.cwd(), "public", url);
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) return;
  await rm(filePath, { force: true }).catch(() => undefined);
}

export function jsonList(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Parses a JSON body; returns a 400 response with the first validation message on failure. */
export async function parseBody<T>(req: Request, schema: ZodType<T>) {
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 }) } as const;
  }
  return { data: parsed.data } as const;
}

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/** 403 response for ordinary members on owner/admin/manager-only actions, else null. */
export function managersOnly(access: AccessContext, what: string) {
  if (access.role !== OrgRole.MEMBER) return null;
  return NextResponse.json({ error: `Only owners, admins and managers can ${what}.` }, { status: 403 });
}

/** Compressed camera photo from fileToCompressedDataUrl. */
export const photoSchema = z
  .string()
  .regex(/^data:image\/(jpeg|png);base64,/, "Photo must be a JPG or PNG")
  .max(6_000_000, "Photo is too large");

export function pdfResponse(bytes: Uint8Array, fileName: string) {
  const name = fileName.replace(/[^\w .()-]+/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** "YYYY-MM-DD" in South African time. */
export function saDateKey(d: Date = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}
