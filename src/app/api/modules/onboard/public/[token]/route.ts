import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { companyName, notFound, parseBody } from "@/lib/modules/common";
import { maskAccount, type Personal } from "@/lib/modules/onboard-items";
import { EDITABLE, bankInput, decrypt, encrypt, loadPublicPacket, personalInput, progress, readBank, serializeDetail } from "@/lib/modules/onboard-server";

/** The hire's own view of their pack. Bank number is masked even here. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const p = await loadPublicPacket((await params).token);
  if (!p) return notFound();
  const d = serializeDetail(p);
  const bank = readBank(p.bankJson);
  return NextResponse.json({
    company: await companyName(p.organizationId),
    employeeName: p.employeeName,
    jobTitle: p.jobTitle,
    startDate: d.startDate,
    status: d.status,
    editable: EDITABLE.includes(p.status),
    reviewNote: p.status === "changes_requested" ? p.reviewNote : null,
    requirements: d.requirements,
    personal: decrypt<Personal>(p.personalJson),
    defaults: { cellphone: p.employeePhone, email: p.employeeEmail },
    bank: bank ? { bankName: bank.bankName, accountHolder: bank.accountHolder, accountType: bank.accountType, branchCode: bank.branchCode, accountMasked: maskAccount(bank.accountNumber) } : null,
    progress: progress(p),
    consentName: p.consentName,
    submittedAt: d.submittedAt,
  });
}

const save = z.discriminatedUnion("step", [
  z.object({ step: z.literal("personal"), data: personalInput }),
  z.object({ step: z.literal("bank"), data: bankInput }),
]);

export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const p = await loadPublicPacket((await params).token);
  if (!p) return notFound();
  if (!EDITABLE.includes(p.status)) return NextResponse.json({ error: "Your pack has been submitted and can no longer be changed." }, { status: 409 });
  const body = await parseBody(req, save);
  if ("error" in body) return body.error;
  const b = body.data;
  const status = p.status === "sent" ? "in_progress" : p.status;
  if (b.step === "personal") {
    const clean = { ...b.data, email: b.data.email || null, taxNumber: b.data.taxNumber || null, idNumber: b.data.idNumber.replace(/\s/g, "") };
    await db.onboardingPacket.update({ where: { id: p.id }, data: { personalJson: encrypt(JSON.stringify(clean)), status } });
  } else {
    await db.onboardingPacket.update({ where: { id: p.id }, data: { bankJson: encrypt(JSON.stringify(b.data)), status } });
  }
  return NextResponse.json({ ok: true });
}
