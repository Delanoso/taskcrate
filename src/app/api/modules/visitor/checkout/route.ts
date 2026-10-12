import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";

const schema = z.union([
  z.object({ visitorId: z.string().min(1) }),
  z.object({ all: z.literal(true) }),
]);

/** Manual check-out by staff, for visitors who left without checking out. */
export async function POST(req: Request) {
  const gate = await requireProductApi("site-visitor");
  if ("error" in gate) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: gate.session.userId },
    select: { fullName: true },
  });
  const data = { checkedOutAt: new Date(), checkedOutBy: user?.fullName ?? "Staff" };
  const scope = {
    checkedOutAt: null,
    site: { organizationId: gate.session.organizationId },
  };

  const result = await db.visitorCheckIn.updateMany({
    where: "all" in parsed.data ? scope : { ...scope, id: parsed.data.visitorId },
    data,
  });
  if (result.count === 0 && !("all" in parsed.data)) {
    return NextResponse.json({ error: "Visitor not found or already checked out" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, count: result.count });
}
