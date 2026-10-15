import { NextResponse } from "next/server";
import { changePassword } from "@/lib/auth";
import { publicOrigin } from "@/lib/public-origin";
import { attachSessionCookie, getSession } from "@/lib/session";

export async function POST(req: Request) {
  const origin = publicOrigin(req);
  const back = new URL("/dashboard/settings/password", origin);
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", origin), 303);

  const fd = await req.formData();
  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (password !== confirm) {
    back.searchParams.set("error", "Those passwords do not match.");
    return NextResponse.redirect(back, 303);
  }

  try {
    const updated = await changePassword(session.userId, current, password);
    const done = new URL("/dashboard/settings/password", origin);
    done.searchParams.set("saved", "1");
    const res = NextResponse.redirect(done, 303);
    await attachSessionCookie(
      res,
      {
        userId: session.userId,
        organizationId: session.organizationId,
        email: session.email,
        sv: updated.sessionVersion,
      },
      req,
    );
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not change the password.";
    back.searchParams.set("error", message);
    return NextResponse.redirect(back, 303);
  }
}
