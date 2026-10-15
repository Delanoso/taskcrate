import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicOrigin } from "@/lib/public-origin";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const origin = publicOrigin(req);
  const back = new URL("/dashboard/settings/password", origin);
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", origin), 303);

  const fd = await req.formData();
  const fullName = String(fd.get("fullName") ?? "").trim().slice(0, 120);
  if (fullName.length < 2) {
    back.searchParams.set("nameError", "Enter the name you want on this account.");
    return NextResponse.redirect(back, 303);
  }

  await db.user.update({ where: { id: session.userId }, data: { fullName } });
  back.searchParams.set("name", "1");
  return NextResponse.redirect(back, 303);
}
