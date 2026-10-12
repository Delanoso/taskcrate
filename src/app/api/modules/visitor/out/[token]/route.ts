import { NextResponse } from "next/server";
import { db } from "@/lib/db";

async function findVisit(token: string) {
  if (!token) return null;
  return db.visitorCheckIn.findFirst({
    where: { checkoutToken: token },
    include: { site: { include: { organization: { include: { branding: true } } } } },
  });
}

function shape(v: NonNullable<Awaited<ReturnType<typeof findVisit>>>) {
  return {
    fullName: v.fullName,
    siteName: v.site.name,
    companyName: v.site.organization.branding?.displayName ?? v.site.organization.name,
    checkedInAt: v.createdAt,
    checkedOutAt: v.checkedOutAt,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const visit = await findVisit((await params).token);
  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ visit: shape(visit) });
}

/** Self check-out from the personal link in the visitor's WhatsApp message. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const visit = await findVisit((await params).token);
  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (visit.checkedOutAt) return NextResponse.json({ visit: shape(visit) });

  const updated = await db.visitorCheckIn.update({
    where: { id: visit.id },
    data: { checkedOutAt: new Date(), checkedOutBy: "Visitor" },
    include: { site: { include: { organization: { include: { branding: true } } } } },
  });
  return NextResponse.json({ visit: shape(updated) });
}
