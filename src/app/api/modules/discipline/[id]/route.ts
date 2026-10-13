import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { managersOnly, notFound, parseBody, removeUpload, saDateKey } from "@/lib/modules/common";
import { OFFENCES, SANCTION_KEYS, isWarning } from "@/lib/modules/discipline-options";
import {
  FOLDER, SLUG, addMonthsTo, caseFiles, employeeFields, fromDateKey, fromLocalDateTime, getSettings,
  newSignToken, opt, saveSignature, serializeCase, validityMonths,
} from "@/lib/modules/discipline-server";

const signature = z.string().regex(/^data:image\/png;base64,/, "Signature missing").max(1_500_000);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Enter a valid date and time");

const action = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("details"),
    ...employeeFields,
    offenceKey: z.enum(OFFENCES.map((o) => o.key) as [string, ...string[]]),
    offence: z.string().trim().min(5, "Describe the charge").max(1000),
    incidentAt: dateTime,
    location: opt(200),
    witnesses: opt(500),
    notes: z.string().trim().min(5, "Describe what happened").max(5000),
  }),
  z.object({ action: z.literal("schedule_hearing"), hearingAt: dateTime, hearingVenue: z.string().trim().min(2, "Enter the venue").max(200), chairperson: z.string().trim().min(2, "Enter the chairperson").max(120) }),
  z.object({ action: z.literal("ack_notice"), signature }),
  z.object({
    action: z.literal("outcome"),
    finding: z.enum(["guilty", "not_guilty"]),
    sanction: z.enum(SANCTION_KEYS),
    sanctionDate: dateKey,
    outcomeReasons: opt(4000),
    mitigating: opt(2000),
    aggravating: opt(2000),
    issuedBy: z.string().trim().min(2, "Enter who issued the outcome").max(120),
    issuerSignature: signature.nullable().optional(),
    validMonths: z.number().int().min(1).max(36).nullable().optional(),
  }),
  z.object({ action: z.literal("sign"), signature, comment: opt(2000) }),
  z.object({ action: z.literal("refused"), witnessName: z.string().trim().min(2, "Enter the witness's name").max(120), witnessSignature: signature }),
  z.object({ action: z.literal("appeal"), appealLodgedAt: dateKey, appealGrounds: z.string().trim().min(3, "Enter the grounds of appeal").max(4000) }),
  z.object({ action: z.literal("appeal_decision"), appealOutcome: z.enum(["upheld", "dismissed", "varied"]), appealNotes: opt(4000), newSanction: z.enum(SANCTION_KEYS).nullable().optional() }),
  z.object({ action: z.literal("withdraw"), reason: z.string().trim().min(3, "Give a reason").max(1000) }),
  z.object({ action: z.literal("reopen") }),
]);

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const c = await db.disciplineEntry.findFirst({ where: { id: (await params).id, organizationId: orgId } });
  if (!c) return notFound();
  const body = await parseBody(req, action);
  if ("error" in body) return body.error;
  const b = body.data;
  const editable = c.status === "open" || c.status === "hearing";
  let data: Prisma.DisciplineEntryUpdateInput;

  switch (b.action) {
    case "details": {
      if (!editable) return bad("Details are locked once an outcome has been issued.", 409);
      const incidentAt = fromLocalDateTime(b.incidentAt);
      if (Number.isNaN(incidentAt.getTime()) || incidentAt.getTime() > Date.now() + 5 * 60_000) return bad("The incident date cannot be in the future");
      data = {
        employeeName: b.employeeName,
        employeeNumber: b.employeeNumber || null,
        employeePhone: b.employeePhone || null,
        jobTitle: b.jobTitle || null,
        department: b.department || null,
        offenceKey: b.offenceKey,
        offence: b.offence,
        offenceSeverity: OFFENCES.find((o) => o.key === b.offenceKey)!.severity,
        incidentAt,
        location: b.location || null,
        witnesses: b.witnesses || null,
        notes: b.notes,
      };
      break;
    }
    case "schedule_hearing": {
      if (!editable) return bad("An outcome has already been issued for this case.", 409);
      const hearingAt = fromLocalDateTime(b.hearingAt);
      if (Number.isNaN(hearingAt.getTime()) || hearingAt.getTime() < Date.now() - 60 * 60_000) return bad("The hearing date must be in the future");
      const moved = c.hearingAt?.getTime() !== hearingAt.getTime() || c.hearingVenue !== b.hearingVenue;
      data = {
        status: "hearing",
        hearingAt,
        hearingVenue: b.hearingVenue,
        chairperson: b.chairperson,
        noticeIssuedAt: new Date(),
        signToken: c.signToken ?? newSignToken(),
        ...(moved ? { noticeAckAt: null, noticeAckSignature: null } : {}),
      };
      break;
    }
    case "ack_notice": {
      if (c.status !== "hearing") return bad("No hearing notice is waiting for acknowledgement.", 409);
      data = { noticeAckAt: new Date(), noticeAckSignature: await saveSignature(b.signature, orgId) };
      break;
    }
    case "outcome": {
      if (c.status === "finalised" || c.status === "withdrawn") return bad("This case is closed.", 409);
      const sanction = b.finding === "not_guilty" ? "not_guilty" : b.sanction;
      if (b.finding === "guilty" && sanction === "not_guilty") return bad("Choose a sanction for a guilty finding");
      if (sanction === "dismissal" && !c.hearingAt) return bad("Schedule and hold a disciplinary hearing before dismissing an employee.");
      if (b.sanctionDate > saDateKey()) return bad("The outcome date cannot be in the future");
      const settings = await getSettings(orgId);
      const sanctionDate = fromDateKey(b.sanctionDate);
      const months = isWarning(sanction) ? b.validMonths ?? validityMonths(settings, sanction) : 0;
      data = {
        stage: sanction,
        finding: b.finding,
        status: "issued",
        sanctionDate,
        validUntil: months ? addMonthsTo(sanctionDate, months) : null,
        outcomeReasons: b.outcomeReasons || null,
        mitigating: b.mitigating || null,
        aggravating: b.aggravating || null,
        issuedBy: b.issuedBy,
        issuerSignature: b.issuerSignature ? await saveSignature(b.issuerSignature, orgId) : c.issuerSignature,
        signToken: c.signToken ?? newSignToken(),
        employeeSignature: null,
        employeeSignedAt: null,
        employeeComment: null,
        refusedToSign: false,
        witnessName: null,
        witnessSignature: null,
      };
      break;
    }
    case "sign": {
      if (c.status !== "issued") return bad("Nothing is waiting for the employee's signature.", 409);
      data = { status: "finalised", employeeSignature: await saveSignature(b.signature, orgId), employeeSignedAt: new Date(), employeeComment: b.comment || null };
      break;
    }
    case "refused": {
      if (c.status !== "issued") return bad("Nothing is waiting for the employee's signature.", 409);
      data = { status: "finalised", refusedToSign: true, witnessName: b.witnessName, witnessSignature: await saveSignature(b.witnessSignature, orgId), employeeSignedAt: new Date() };
      break;
    }
    case "appeal": {
      if (c.status !== "issued" && c.status !== "finalised") return bad("Only an issued outcome can be appealed.", 409);
      data = { appealLodgedAt: fromDateKey(b.appealLodgedAt), appealGrounds: b.appealGrounds, appealOutcome: null, appealNotes: null, appealDecidedAt: null };
      break;
    }
    case "appeal_decision": {
      if (!c.appealLodgedAt) return bad("Record the appeal first.", 409);
      data = { appealOutcome: b.appealOutcome, appealNotes: b.appealNotes || null, appealDecidedAt: new Date() };
      if (b.appealOutcome === "varied") {
        if (!b.newSanction || b.newSanction === c.stage) return bad("Choose the new sanction");
        const settings = await getSettings(orgId);
        const months = validityMonths(settings, b.newSanction);
        const from = c.sanctionDate ?? new Date();
        data = { ...data, stage: b.newSanction, validUntil: months ? addMonthsTo(from, months) : null };
      }
      break;
    }
    case "withdraw": {
      if (c.status === "withdrawn") return bad("Already withdrawn.", 409);
      data = { status: "withdrawn", withdrawnReason: b.reason };
      break;
    }
    case "reopen": {
      if (c.status !== "withdrawn") return bad("Only withdrawn cases can be reopened.", 409);
      data = { status: c.hearingAt ? "hearing" : "open", withdrawnReason: null, stage: "pending", finding: null, validUntil: null };
      break;
    }
  }

  const updated = await db.disciplineEntry.update({ where: { id: c.id }, data });
  return NextResponse.json({ case: serializeCase(updated) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const denied = managersOnly(gate.access, "delete disciplinary cases");
  if (denied) return denied;
  const c = await db.disciplineEntry.findFirst({ where: { id: (await params).id, organizationId: gate.session.organizationId } });
  if (!c) return notFound();
  await db.disciplineEntry.delete({ where: { id: c.id } });
  await Promise.all(caseFiles(c).map((u) => removeUpload(u, FOLDER, c.organizationId)));
  return NextResponse.json({ ok: true });
}
