import { NextResponse } from "next/server";
import { z } from "zod";
import { registerOrganization } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  acceptedTerms: z.literal(true),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    await registerOrganization(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
