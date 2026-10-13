import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { appUrl, companyName, jsonList, managersOnly, parseBody } from "@/lib/modules/common";
import { SLUG, createReport, getBoard, reportInput, serializeReport } from "@/lib/modules/nearmiss-server";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const board = await getBoard(orgId);
  const reports = await db.nearMissReport.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    company: await companyName(orgId),
    publicUrl: `${appUrl()}/p/nearmiss/${board.publicToken}`,
    locations: jsonList(board.locationsJson),
    canManage: gate.access.role !== "MEMBER",
    reports: reports.map(serializeReport),
  });
}

/** Staff log a report on someone's behalf (e.g. told verbally at a toolbox talk). */
export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const body = await parseBody(req, reportInput);
  if ("error" in body) return body.error;
  const report = await createReport(gate.session.organizationId, body.data);
  return NextResponse.json({ report: serializeReport(report) });
}

/** Board settings: the list of areas shown on the public form. */
export async function PUT(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "change board settings");
  if (denied) return denied;
  const body = await parseBody(req, z.object({ locations: z.array(z.string().trim().min(1).max(80)).max(100) }));
  if ("error" in body) return body.error;
  const locations = [...new Set(body.data.locations)];
  const board = await getBoard(gate.session.organizationId);
  await db.nearMissBoard.update({ where: { id: board.id }, data: { locationsJson: JSON.stringify(locations) } });
  return NextResponse.json({ locations });
}
