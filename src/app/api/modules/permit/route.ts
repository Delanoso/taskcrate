import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildPermitClosedPdf } from "@/lib/modules/permit-pdf";

export async function GET() {
  const gate = await requireProductApi("permit-to-work");
  if ("error" in gate) return gate.error;
  const items = await db.workPermit.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

const createSchema = z.object({ title: z.string().min(2) });

export async function POST(req: Request) {
  const gate = await requireProductApi("permit-to-work");
  if ("error" in gate) return gate.error;
  const body = createSchema.parse(await req.json());
  const item = await db.workPermit.create({
    data: { organizationId: gate.session.organizationId, title: body.title },
  });
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host") ?? "";
  const forwardedProto = (req.headers.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    ?.trim();
  const proto =
    forwardedProto ||
    (host.includes("lhr.life") ||
    host.includes("loca.lt") ||
    host.includes("trycloudflare.com") ||
    host.includes("ngrok")
      ? "https"
      : "http");
  const origin = req.headers.get("origin");
  const appUrl =
    origin ||
    (host ? `${proto}://${host}` : null) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3847";
  return NextResponse.json({
    item,
    publicUrl: `${appUrl}/p/permit/${item.publicToken}`,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireProductApi("permit-to-work");
  if ("error" in gate) return gate.error;
  const body = z
    .object({
      id: z.string(),
      status: z.enum(["approved", "closed"]),
      managerNotes: z.string().optional(),
    })
    .parse(await req.json());

  const existing = await db.workPermit.findFirst({
    where: { id: body.id, organizationId: gate.session.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await db.workPermit.update({
    where: { id: body.id },
    data: { status: body.status, managerNotes: body.managerNotes },
  });

  let pdf: { documentNumber: string } | undefined;
  let pdfBytesBase64: string | undefined;
  if (body.status === "closed") {
    const result = await buildPermitClosedPdf(item);
    const closed = await db.workPermit.update({
      where: { id: item.id },
      data: { documentNumber: result.documentNumber },
    });
    pdf = { documentNumber: result.documentNumber };
    pdfBytesBase64 = Buffer.from(result.bytes).toString("base64");
    return NextResponse.json({ item: closed, pdf, pdfBytesBase64 });
  }

  return NextResponse.json({ item, pdf });
}
