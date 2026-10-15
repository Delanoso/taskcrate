import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/password-reset";
import { publicOrigin } from "@/lib/public-origin";

export async function POST(req: Request) {
  const origin = publicOrigin(req);
  const fd = await req.formData();
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const back = new URL("/reset-password", origin);
  if (token) back.searchParams.set("token", token);

  if (password !== confirm) {
    back.searchParams.set("error", "Those passwords do not match.");
    return NextResponse.redirect(back, 303);
  }

  try {
    await resetPassword(token, password);
    const login = new URL("/login", origin);
    login.searchParams.set("reset", "1");
    return NextResponse.redirect(login, 303);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reset the password.";
    back.searchParams.set("error", message);
    return NextResponse.redirect(back, 303);
  }
}
