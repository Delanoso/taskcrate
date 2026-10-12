import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

export async function GET() {
  const gate = await requireProductApi("near-miss-whisperer");
  if ("error" in gate) return gate.error;
  let board = await db.nearMissBoard.findUnique({
    where: { organizationId: gate.session.organizationId },
  });
  if (!board) {
    board = await db.nearMissBoard.create({
      data: { organizationId: gate.session.organizationId },
    });
  }
  const reports = await db.nearMissReport.findMany({
    where: { organizationId: gate.session.organizationId },
    orderBy: { createdAt: "desc" },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3847";
  return NextResponse.json({
    board,
    reports,
    publicUrl: `${appUrl}/p/nearmiss/${board.publicToken}`,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireProductApi("near-miss-whisperer");
  if ("error" in gate) return gate.error;
  const body = z
    .object({ id: z.string(), status: z.enum(["triaged", "closed"]) })
    .parse(await req.json());
  const report = await db.nearMissReport.findFirst({
    where: { id: body.id, organizationId: gate.session.organizationId },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.nearMissReport.update({
    where: { id: body.id },
    data: { status: body.status },
  });
  return NextResponse.json({ report: updated });
}
