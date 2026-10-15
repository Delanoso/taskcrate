import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";
import { publicOrigin } from "@/lib/public-origin";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const origin = publicOrigin(req);
  const back = new URL("/forgot-password", origin);

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const isForm =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");
    const email = isForm
      ? String((await req.formData()).get("email") ?? "").trim()
      : String((await req.json()).email ?? "").trim();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      back.searchParams.set("error", "Enter a valid email address.");
      return NextResponse.redirect(back, 303);
    }

    await requestPasswordReset(parsed.data.email, origin);
    back.searchParams.set("sent", "1");
    return NextResponse.redirect(back, 303);
  } catch {
    back.searchParams.set("error", "Could not send the reset email. Try again in a few minutes.");
    return NextResponse.redirect(back, 303);
  }
}
