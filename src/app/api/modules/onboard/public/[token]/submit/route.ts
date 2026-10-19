import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { alertCompany } from "@/lib/email";
import { notFound, parseBody, removeUpload } from "@/lib/modules/common";
import { saveDataUrlUpload } from "@/lib/uploads";
import { EDITABLE, FOLDER, SLUG, loadPublicPacket, progress } from "@/lib/modules/onboard-server";

const submitInput = z.object({
  consentName: z.string().trim().min(3, "Type your full name").max(120),
  agree: z.literal(true, { error: "You must accept the declaration" }),
  signature: z.string().regex(/^data:image\/png;base64,/, "Please sign in the box").max(1_500_000),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const p = await loadPublicPacket((await params).token);
  if (!p) return notFound();
  if (!EDITABLE.includes(p.status)) return NextResponse.json({ error: "Your pack has already been submitted." }, { status: 409 });
  const body = await parseBody(req, submitInput);
  if ("error" in body) return body.error;
  const pr = progress(p);
  if (pr.done < pr.total) {
    const missing = [!p.personalJson && "personal details", !p.bankJson && "bank details", ...pr.missing].filter(Boolean).join(", ");
    return NextResponse.json({ error: `Still missing: ${missing}.` }, { status: 400 });
  }
  const signature = await saveDataUrlUpload(body.data.signature, `${FOLDER}/${p.organizationId}`);
  if (p.consentSignature) await removeUpload(p.consentSignature, FOLDER, p.organizationId);
  const resubmit = p.status === "changes_requested";
  await db.onboardingPacket.update({
    where: { id: p.id },
    data: { status: "submitted", consentName: body.data.consentName, consentSignature: signature, consentAt: new Date(), submittedAt: new Date(), reviewNote: null },
  });
  const title = `${p.employeeName} ${resubmit ? "re-submitted" : "submitted"} their onboarding pack`;
  await alertCompany(p.organizationId, {
    productSlug: SLUG,
    title,
    body: "Review the details and documents, then approve or request changes.",
    kind: "onboard_submitted",
    subject: title,
    lines: [`${p.employeeName} sent their pack.`, "Review it and approve it, or send it back. It stays on the morning list until you do."],
  });
  return NextResponse.json({ ok: true });
}
