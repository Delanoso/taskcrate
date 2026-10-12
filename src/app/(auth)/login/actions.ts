"use server";

import { redirect } from "next/navigation";
import { authenticateUser } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const { session } = await authenticateUser({ email, password });
    await createSession(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/dashboard");
}
