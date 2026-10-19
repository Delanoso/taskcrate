import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, parseBody } from "@/lib/modules/common";
import { BUILTIN_REASONS } from "@/lib/modules/aod-options";
import { SLUG } from "@/lib/modules/aod-server";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), label: z.string().trim().min(3, "Name the reason").max(120), kind: z.enum(["loan", "deductible"]) }),
  z.object({ action: z.literal("archive"), id: z.string(), archived: z.boolean() }),
]);

/** Company-specific AOD reasons (e.g. "Petrol card misuse", "Tool purchase"). */
export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "change AOD reasons");
  if (denied) return denied;
  const orgId = gate.session.organizationId;
  const body = await parseBody(req, input);
  if ("error" in body) return body.error;
  const b = body.data;
  if (b.action === "add") {
    const lower = b.label.toLowerCase();
    const clash = BUILTIN_REASONS.some((r) => r.label.toLowerCase() === lower) || (await db.aodReason.findFirst({ where: { organizationId: orgId, label: b.label } }));
    if (clash) return NextResponse.json({ error: "That reason already exists." }, { status: 409 });
    const r = await db.aodReason.create({ data: { organizationId: orgId, label: b.label, kind: b.kind } });
    return NextResponse.json({ reason: { id: r.id, key: `c:${r.id}`, label: r.label, kind: r.kind, archived: false } });
  }
  const r = await db.aodReason.findFirst({ where: { id: b.id, organizationId: orgId } });
  if (!r) return notFound();
  const u = await db.aodReason.update({ where: { id: r.id }, data: { archived: b.archived } });
  return NextResponse.json({ reason: { id: u.id, key: `c:${u.id}`, label: u.label, kind: u.kind, archived: u.archived } });
}
