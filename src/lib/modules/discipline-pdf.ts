import type { DisciplineEntry } from "@/generated/prisma/client";
import { RIGHTS, SEVERITY_LABEL, offenceByKey, sanctionDoc, sanctionLabel } from "@/lib/modules/discipline-options";
import { serializeCase } from "@/lib/modules/discipline-server";
import { createBrandedDocument, fmtDate, fmtDateTime } from "@/lib/modules/pdf-kit";

type Doc = Awaited<ReturnType<typeof createBrandedDocument>>;

const ref = (c: DisciplineEntry) => serializeCase(c).reference;

function employeeBlock(doc: Doc, c: DisciplineEntry) {
  doc.heading("Employee");
  doc.field("Name", c.employeeName);
  doc.field("Employee number", c.employeeNumber);
  doc.field("Job title", c.jobTitle);
  doc.field("Department", c.department);
}

function incidentBlock(doc: Doc, c: DisciplineEntry, title = "Charge") {
  const o = offenceByKey(c.offenceKey);
  doc.heading(title);
  doc.field("Offence", o?.label ?? "Misconduct");
  if (c.offenceSeverity) doc.field("Category", SEVERITY_LABEL[c.offenceSeverity as keyof typeof SEVERITY_LABEL] ?? c.offenceSeverity);
  doc.field("Date and time", fmtDateTime(c.incidentAt));
  doc.field("Place", c.location);
  doc.field("Charge", c.offence);
  doc.field("Details", c.notes);
  if (c.witnesses) doc.field("Witnesses", c.witnesses);
}

export async function buildNoticePdf(c: DisciplineEntry) {
  const doc = await createBrandedDocument({ organizationId: c.organizationId, title: "Notice to Attend a Disciplinary Hearing", documentNumber: ref(c) });
  doc.paragraph(`Date of notice: ${c.noticeIssuedAt ? fmtDate(c.noticeIssuedAt) : fmtDate(new Date())}`, { color: doc.muted, size: 9 });
  doc.y -= 4;
  employeeBlock(doc, c);
  doc.heading("Hearing");
  doc.field("Date and time", c.hearingAt ? fmtDateTime(c.hearingAt) : "To be confirmed");
  doc.field("Venue", c.hearingVenue);
  doc.field("Chairperson", c.chairperson);
  incidentBlock(doc, c, "Allegation(s) against you");
  doc.heading("Your rights");
  for (const r of RIGHTS) doc.paragraph(`- ${r}`, { indent: 4 });
  doc.y -= 6;
  doc.paragraph("Please bring any documents or evidence you wish to rely on. If you need more time to prepare, ask the person who issued this notice before the hearing.", { size: 9, color: doc.muted });
  doc.y -= 10;
  doc.heading("Acknowledgement of receipt");
  doc.paragraph("I acknowledge that I have received this notice. Signing does not mean that I admit to the allegations.", { size: 9 });
  doc.y -= 6;
  await doc.signatures([
    { label: "Employee", name: c.employeeName, date: c.noticeAckAt, url: c.noticeAckSignature, note: c.noticeAckAt ? "" : "Not yet signed" },
    { label: "Chairperson", name: c.chairperson ?? "" },
  ]);
  return doc.finish();
}

export async function buildOutcomePdf(c: DisciplineEntry) {
  const title = sanctionDoc(c.stage);
  const doc = await createBrandedDocument({ organizationId: c.organizationId, title, documentNumber: ref(c) });
  doc.paragraph(`Date: ${c.sanctionDate ? fmtDate(c.sanctionDate) : "-"}`, { color: doc.muted, size: 9 });
  doc.y -= 4;
  employeeBlock(doc, c);
  incidentBlock(doc, c, "Misconduct");
  if (c.photosJson !== "[]" || c.photoUrl) {
    const photos = serializeCase(c).photos;
    if (photos.length) {
      doc.paragraph("Evidence photos:", { size: 9, font: doc.bold });
      await doc.imageRow(photos.slice(0, 4), 90);
    }
  }

  doc.heading("Outcome");
  if (c.hearingAt) doc.field("Hearing held", `${fmtDateTime(c.hearingAt)}${c.chairperson ? `, chaired by ${c.chairperson}` : ""}`);
  doc.field("Finding", c.finding === "not_guilty" ? "Not guilty" : c.finding === "guilty" ? "Guilty" : "-");
  doc.field("Sanction", sanctionLabel(c.stage));
  if (c.validUntil) doc.field("Valid until", `${fmtDate(c.validUntil)} (after this date the warning lapses)`);
  if (c.mitigating) doc.field("Mitigating factors", c.mitigating);
  if (c.aggravating) doc.field("Aggravating factors", c.aggravating);
  if (c.outcomeReasons) doc.field("Reasons", c.outcomeReasons);

  doc.y -= 4;
  if (c.stage === "dismissal") {
    doc.paragraph("Your employment is terminated with effect from the date above. You may refer a dispute about the fairness of this dismissal to the CCMA or the relevant bargaining council within 30 days of the date of dismissal. You may also appeal internally as set out below.", { size: 9 });
  } else if (["verbal", "written", "final"].includes(c.stage)) {
    doc.paragraph(
      c.stage === "final"
        ? "This is a FINAL warning. Any further misconduct of a similar or serious nature while this warning is valid may lead to your dismissal."
        : "Further misconduct while this warning is valid may lead to more serious disciplinary action.",
      { size: 9, font: doc.bold },
    );
  }
  doc.paragraph("You may appeal this outcome in writing within 5 working days of receiving it, stating your grounds of appeal.", { size: 9, color: doc.muted });

  if (c.appealLodgedAt) {
    doc.heading("Appeal");
    doc.field("Lodged", fmtDate(c.appealLodgedAt));
    doc.field("Grounds", c.appealGrounds);
    doc.field("Outcome", c.appealOutcome ? { upheld: "Upheld - sanction set aside", dismissed: "Dismissed - sanction stands", varied: `Varied - sanction changed to ${sanctionLabel(c.stage)}` }[c.appealOutcome] ?? c.appealOutcome : "Pending");
    if (c.appealNotes) doc.field("Notes", c.appealNotes);
  }

  doc.heading("Signatures");
  if (c.employeeComment) doc.field("Employee's comment", c.employeeComment);
  doc.paragraph("The employee signs to confirm receipt of this document, not necessarily agreement with it.", { size: 9, color: doc.muted });
  doc.y -= 6;
  const items: Parameters<Doc["signatures"]>[0] = [
    {
      label: "Employee",
      name: c.employeeName,
      date: c.refusedToSign ? null : c.employeeSignedAt,
      url: c.refusedToSign ? null : c.employeeSignature,
      note: c.refusedToSign ? "Refused to sign" : "Not yet signed",
    },
    { label: "Issued by", name: c.issuedBy, date: c.sanctionDate, url: c.issuerSignature },
  ];
  if (c.refusedToSign) items.push({ label: "Witness (employee refused to sign)", name: c.witnessName, date: c.employeeSignedAt, url: c.witnessSignature });
  await doc.signatures(items);
  return doc.finish();
}

/** Every case for one employee, oldest first: the bundle to hand to the CCMA. */
export async function buildHistoryPdf(organizationId: string, cases: DisciplineEntry[], documentNumber: string) {
  const first = cases[0];
  const doc = await createBrandedDocument({ organizationId, title: `Disciplinary Record - ${first.employeeName}`, documentNumber });
  employeeBlock(doc, cases[cases.length - 1]);
  doc.heading("Summary");
  doc.field("Cases on file", String(cases.length));
  const active = cases.map(serializeCase).filter((c) => c.activeWarning);
  doc.field("Active warnings", active.length ? active.map((c) => `${c.sanctionLabel} (until ${c.validUntil})`).join("; ") : "None");
  doc.y -= 4;
  doc.heading("Timeline");
  for (const c of cases) {
    const s = serializeCase(c);
    doc.paragraph(`${fmtDate(c.incidentAt)}  ${s.reference}  ${s.offenceLabel}  -  ${s.status === "withdrawn" ? "Withdrawn" : s.sanctionLabel}${s.appealOutcome === "upheld" ? " (overturned on appeal)" : ""}`, { size: 9 });
  }

  for (const c of cases) {
    const s = serializeCase(c);
    doc.addPage();
    doc.heading(`${s.reference}: ${s.offenceLabel}`, 13);
    incidentBlock(doc, c, "Incident");
    if (s.photos.length) await doc.imageRow(s.photos.slice(0, 8), 90);
    doc.heading("Process");
    doc.field("Status", s.status === "withdrawn" ? `Withdrawn: ${c.withdrawnReason ?? ""}` : s.status);
    if (c.hearingAt) doc.field("Hearing", `${fmtDateTime(c.hearingAt)} at ${c.hearingVenue ?? "-"}, chair ${c.chairperson ?? "-"}`);
    if (c.noticeIssuedAt) doc.field("Notice issued", `${fmtDate(c.noticeIssuedAt)}${c.noticeAckAt ? `, acknowledged ${fmtDateTime(c.noticeAckAt)}` : ", not acknowledged"}`);
    doc.field("Finding", c.finding === "not_guilty" ? "Not guilty" : c.finding === "guilty" ? "Guilty" : "-");
    doc.field("Sanction", s.sanctionLabel);
    if (c.sanctionDate) doc.field("Issued", `${fmtDate(c.sanctionDate)} by ${c.issuedBy ?? "-"}`);
    if (c.validUntil) doc.field("Valid until", fmtDate(c.validUntil));
    if (c.outcomeReasons) doc.field("Reasons", c.outcomeReasons);
    if (c.mitigating) doc.field("Mitigating", c.mitigating);
    if (c.aggravating) doc.field("Aggravating", c.aggravating);
    doc.field(
      "Employee",
      c.refusedToSign ? `Refused to sign; witnessed by ${c.witnessName ?? "-"}` : c.employeeSignedAt ? `Signed ${fmtDateTime(c.employeeSignedAt)}` : "Not signed",
    );
    if (c.employeeComment) doc.field("Employee's comment", c.employeeComment);
    if (c.appealLodgedAt) doc.field("Appeal", `Lodged ${fmtDate(c.appealLodgedAt)}: ${c.appealGrounds ?? ""}. Outcome: ${c.appealOutcome ?? "pending"}${c.appealNotes ? ` - ${c.appealNotes}` : ""}`);
    if (c.employeeSignature || c.issuerSignature || c.witnessSignature) {
      doc.y -= 6;
      await doc.signatures(
        [
          { label: "Employee", name: c.employeeName, url: c.refusedToSign ? null : c.employeeSignature, note: c.refusedToSign ? "Refused" : "" },
          { label: "Issued by", name: c.issuedBy, url: c.issuerSignature },
          ...(c.refusedToSign ? [{ label: "Witness", name: c.witnessName, url: c.witnessSignature }] : []),
        ],
      );
    }
  }
  return doc.finish();
}
