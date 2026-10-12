import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/** Last 9 digits, so 082…, +27 82… and 27 82… all match. */
const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-9);

/** Gate QR check-out: visitor enters the WhatsApp number they checked in with. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = await db.visitorSite.findUnique({ where: { publicToken: token } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = z.object({ phone: z.string() }).safeParse(await req.json().catch(() => null));
  const key = parsed.success ? phoneKey(parsed.data.phone) : "";
  if (key.length < 9) {
    return NextResponse.json({ error: "Enter the WhatsApp number you checked in with." }, { status: 400 });
  }

  const open = await db.visitorCheckIn.findMany({
    where: { siteId: site.id, checkedOutAt: null },
    select: { id: true, fullName: true, phone: true },
  });
  const mine = open.filter((v) => phoneKey(v.phone) === key);
  if (mine.length === 0) {
    return NextResponse.json(
      { error: "No open check-in found for that number. Please let reception know." },
      { status: 404 },
    );
  }
  await db.visitorCheckIn.updateMany({
    where: { id: { in: mine.map((v) => v.id) } },
    data: { checkedOutAt: new Date(), checkedOutBy: "Visitor" },
  });
  return NextResponse.json({ ok: true, fullName: mine[0].fullName });
}
