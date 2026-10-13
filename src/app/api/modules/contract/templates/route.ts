import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, parseBody } from "@/lib/modules/common";
import { CONTRACT_LIBRARY } from "@/lib/modules/contract-library";
import { SLUG, serializeTemplate, templateInput } from "@/lib/modules/contract-server";

const input = z.union([z.object({ librarySlug: z.string() }), templateInput.refine((t) => t.bodyText.trim().length >= 20, { message: "The document text is too short" })]);

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "manage templates");
  if (denied) return denied;
  const body = await parseBody(req, input);
  if ("error" in body) return body.error;
  const b = body.data;
  let data;
  if ("librarySlug" in b) {
    const lib = CONTRACT_LIBRARY.find((t) => t.slug === b.librarySlug);
    if (!lib) return NextResponse.json({ error: "Unknown library template" }, { status: 404 });
    data = { name: lib.name, category: lib.category, bodyText: lib.bodyText, requireCountersign: lib.requireCountersign, dueDays: lib.dueDays };
  } else {
    data = { name: b.name, category: b.category, bodyText: b.bodyText.trim(), requireCountersign: b.requireCountersign, dueDays: b.dueDays ?? null };
  }
  const t = await db.contractTemplate.create({ data: { organizationId: gate.session.organizationId, kind: "text", ...data } });
  return NextResponse.json({ template: serializeTemplate(t) });
}
