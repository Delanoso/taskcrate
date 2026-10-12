import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildPermitClosedPdf, nextPermitDocumentNumber } from "@/lib/modules/permit-pdf";
import { PERMIT_MAX_DURATION_MS } from "@/lib/modules/permit-options";
import { saveDataUrlUpload } from "@/lib/uploads";

export async function GET() {
  const gate = await requireProductApi("permit-to-work");
  if ("error" in gate) return gate.error;
  const items = await db.workPermit.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

const createSchema = z.object({
  title: z.string().trim().min(2, "Enter a permit title."),
  issuerName: z.string().trim().min(2, "Enter the permit issuer's name."),
  specificLocation: z.string().trim().optional(),
  startAt: z.string().min(1, "Enter a start time."),
  expiresAt: z.string().min(1, "Enter an expiry time."),
});

export async function POST(req: Request) {
  const gate = await requireProductApi("permit-to-work");
  if ("error" in gate) return gate.error;
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const body = parsed.data;

  const startAt = new Date(body.startAt);
  const expiresAt = new Date(body.expiresAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Invalid start or expiry time." }, { status: 400 });
  }
  if (expiresAt <= startAt) {
    return NextResponse.json({ error: "Expiry must be after the start time." }, { status: 400 });
  }
  if (expiresAt.getTime() - startAt.getTime() > PERMIT_MAX_DURATION_MS) {
    return NextResponse.json(
      { error: "A general safety permit may not exceed 24 hours without renewal." },
      { status: 400 },
    );
  }

  const documentNumber = await nextPermitDocumentNumber(gate.session.organizationId);
  const item = await db.workPermit.create({
    data: {
      organizationId: gate.session.organizationId,
      title: body.title,
      issuerName: body.issuerName,
      specificLocation: body.specificLocation || null,
      startAt,
      expiresAt,
      documentNumber,
    },
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

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["approved", "closed"]),
  managerNotes: z.string().optional(),
  issuerSignatureDataUrl: z.string().startsWith("data:image/").optional(),
});

export async function PATCH(req: Request) {
  const gate = await requireProductApi("permit-to-work");
  if ("error" in gate) return gate.error;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const body = parsed.data;

  const existing = await db.workPermit.findFirst({
    where: { id: body.id, organizationId: gate.session.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowedFrom = body.status === "approved" ? ["submitted"] : ["completed"];
  if (!allowedFrom.includes(existing.status)) {
    return NextResponse.json(
      {
        error:
          body.status === "approved"
            ? "Only submitted permits can be approved."
            : "The receiver must sign the close-out before the permit can be closed.",
      },
      { status: 400 },
    );
  }
  if (!body.issuerSignatureDataUrl) {
    return NextResponse.json(
      {
        error:
          body.status === "approved"
            ? "The issuer must sign before approving."
            : "The issuer must sign the close-out before closing.",
      },
      { status: 400 },
    );
  }

  const sigUrl = await saveDataUrlUpload(
    body.issuerSignatureDataUrl,
    `permits/${gate.session.organizationId}`,
  );
  const now = new Date();

  if (body.status === "approved") {
    const item = await db.workPermit.update({
      where: { id: body.id },
      data: {
        status: "approved",
        managerNotes: body.managerNotes || existing.managerNotes,
        preWorkIssuerSigUrl: sigUrl,
        preWorkIssuerSignedAt: now,
      },
    });
    return NextResponse.json({ item });
  }

  const item = await db.workPermit.update({
    where: { id: body.id },
    data: {
      status: "closed",
      managerNotes: body.managerNotes || existing.managerNotes,
      postWorkIssuerSigUrl: sigUrl,
      postWorkIssuerSignedAt: now,
    },
  });
  const result = await buildPermitClosedPdf(item);
  const closed = item.documentNumber
    ? item
    : await db.workPermit.update({
        where: { id: item.id },
        data: { documentNumber: result.documentNumber },
      });
  return NextResponse.json({
    item: closed,
    pdf: { documentNumber: result.documentNumber },
    pdfBytesBase64: Buffer.from(result.bytes).toString("base64"),
  });
}
