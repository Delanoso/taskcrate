import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companyName, jsonList, notFound, parseBody } from "@/lib/modules/common";
import { createReport, reportInput, trackingUrl } from "@/lib/modules/nearmiss-server";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const board = await db.nearMissBoard.findUnique({ where: { publicToken: (await params).token } });
  if (!board) return notFound();
  return NextResponse.json({
    companyName: await companyName(board.organizationId),
    locations: jsonList(board.locationsJson),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const board = await db.nearMissBoard.findUnique({ where: { publicToken: (await params).token } });
  if (!board) return notFound();
  const body = await parseBody(req, reportInput);
  if ("error" in body) return body.error;
  const report = await createReport(board.organizationId, body.data);
  return NextResponse.json({
    ok: true,
    reference: report.reference,
    trackingUrl: trackingUrl(report.trackingToken!),
  });
}
