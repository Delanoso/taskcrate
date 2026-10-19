import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AttendanceError, clockAttendance } from "@/lib/modules/attendance";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const site = await db.attendanceSite.findUnique({ where: { publicToken: (await params).token } });
  if (!site) return NextResponse.json({ error: "This link is not active" }, { status: 404 });
  return NextResponse.json({ site: { name: site.name, location: site.location } });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const site = await db.attendanceSite.findUnique({ where: { publicToken: (await params).token } });
  if (!site) return NextResponse.json({ error: "This link is not active" }, { status: 404 });
  try {
    const punch = await clockAttendance(site, await req.json().catch(() => null));
    return NextResponse.json({
      direction: punch.direction,
      fullName: punch.fullName,
      when: punch.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AttendanceError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
