import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser } from "@/lib/auth";
import { attachSessionCookie } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "taskcrate.co.za";
  const proto =
    (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]?.trim() ||
    (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const isForm =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  try {
    let email: string;
    let password: string;
    if (isForm) {
      const fd = await req.formData();
      email = String(fd.get("email") ?? "").trim();
      password = String(fd.get("password") ?? "");
    } else {
      const body = schema.parse(await req.json());
      email = body.email;
      password = body.password;
    }
    schema.parse({ email, password });
    const { session } = await authenticateUser({ email, password });

    if (isForm) {
      const res = NextResponse.redirect(new URL("/dashboard", publicOrigin(req)), 303);
      await attachSessionCookie(res, session, req);
      return res;
    }

    const res = NextResponse.json({ ok: true });
    await attachSessionCookie(res, session, req);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    if (isForm) {
      const url = new URL("/login", publicOrigin(req));
      url.searchParams.set("error", message);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
