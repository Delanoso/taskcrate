import { NextResponse } from "next/server";
import { requireProductApi } from "@/lib/modules/api-guard";
import { AttendanceError, attendanceSnapshot, createAttendanceSite } from "@/lib/modules/attendance";

const SLUG = "site-attendance";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  return NextResponse.json(await attendanceSnapshot(gate.session.organizationId));
}

export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  try {
    const site = await createAttendanceSite(gate.session.organizationId, await req.json().catch(() => null));
    return NextResponse.json({ site });
  } catch (error) {
    if (error instanceof AttendanceError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
