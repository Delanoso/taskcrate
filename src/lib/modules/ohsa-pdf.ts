import { rgb } from "pdf-lib";
import { AUDIT_QUESTIONS, AUDIT_SECTIONS, auditSummary } from "@/lib/modules/ohsa-audit-items";
import { createBrandedDocument, fmtDateTime, MARGIN, PAGE_W, safe, wrap } from "@/lib/modules/pdf-kit";

type AuditForPdf = {
  organizationId: string;
  title: string;
  monthLabel: string;
  auditorName: string | null;
  documentNumber: string;
  createdAt: Date;
  completedAt: Date | null;
  answers: { questionId: string; answer: string | null; note: string | null; photosJson: string }[];
};

const BADGE = {
  yes: { text: "YES", color: rgb(0.09, 0.5, 0.24) },
  no: { text: "NO", color: rgb(0.78, 0.13, 0.13) },
  na: { text: "N/A", color: rgb(0.5, 0.5, 0.5) },
  none: { text: "-", color: rgb(0.7, 0.7, 0.7) },
} as const;

const photos = (json: string): string[] => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
};

export async function buildAuditPdf(audit: AuditForPdf) {
  const doc = await createBrandedDocument({
    organizationId: audit.organizationId,
    title: `Health & Safety Audit - ${audit.title}`,
    documentNumber: audit.documentNumber,
  });
  const byId = new Map(audit.answers.map((a) => [a.questionId, a]));
  const summary = auditSummary(audit.answers);

  doc.heading("Audit details");
  doc.field("Site / area", audit.title);
  doc.field("Audit period", audit.monthLabel);
  doc.field("Auditor", audit.auditorName);
  doc.field("Company", doc.companyName);
  doc.field("Started", fmtDateTime(audit.createdAt));
  doc.field("Completed", audit.completedAt ? fmtDateTime(audit.completedAt) : "In progress");
  doc.field("Document number", audit.documentNumber);

  doc.heading("Summary");
  doc.field("Compliance", summary.compliance === null ? "-" : `${summary.compliance}%  (Yes / (Yes + No))`);
  doc.field("Yes", String(summary.yes));
  doc.field("No (findings)", String(summary.no));
  doc.field("Not applicable", String(summary.na));
  doc.field("Not answered", String(summary.total - summary.answered));
  doc.y -= 4;
  for (const s of AUDIT_SECTIONS) {
    const qs = AUDIT_QUESTIONS.filter((q) => q.sectionId === s.id);
    const sub = auditSummary(qs.map((q) => ({ questionId: q.id, answer: byId.get(q.id)?.answer ?? null })));
    doc.field(
      `Section ${s.id}`,
      `${s.title}: ${sub.compliance === null ? "-" : `${sub.compliance}%`}  (yes ${sub.yes}, no ${sub.no}, n/a ${sub.na})`,
      70,
    );
  }

  const findings = AUDIT_QUESTIONS.filter((q) => byId.get(q.id)?.answer === "no");
  doc.heading(`Findings (${findings.length})`);
  if (!findings.length) doc.paragraph("No findings recorded.", { color: doc.muted });
  for (const [i, q] of findings.entries()) {
    const a = byId.get(q.id)!;
    doc.ensure(40);
    doc.paragraph(`${i + 1}. ${q.subsectionId} ${q.subsectionTitle}`, { size: 9, font: doc.bold, color: doc.muted });
    doc.paragraph(`${q.letter}) ${q.text}`, { indent: 12 });
    if (a.note) doc.paragraph(`Note: ${a.note}`, { indent: 12, size: 9, color: rgb(0.3, 0.3, 0.3) });
    await doc.imageRow(photos(a.photosJson), 100, 12);
    doc.y -= 6;
  }

  doc.addPage();
  doc.heading("Full checklist");
  const textX = MARGIN + 36;
  const textW = PAGE_W - MARGIN - textX;
  for (const s of AUDIT_SECTIONS) {
    doc.heading(`${s.id}. ${s.title}`, 12);
    for (const sub of s.subsections) {
      doc.ensure(34);
      doc.paragraph(`${sub.id} ${sub.title}`, { size: 10, font: doc.bold });
      doc.y -= 2;
      for (const q of AUDIT_QUESTIONS.filter((x) => x.subsectionId === sub.id)) {
        const a = byId.get(q.id);
        const badge = BADGE[(a?.answer as "yes" | "no" | "na") ?? "none"] ?? BADGE.none;
        const lines = wrap(safe(`${q.letter}) ${q.text}`), doc.font, 9, textW);
        doc.ensure(lines.length * 12 + 2);
        doc.page.drawText(badge.text, { x: MARGIN, y: doc.y, size: 8, font: doc.bold, color: badge.color });
        for (const l of lines) {
          doc.page.drawText(l, { x: textX, y: doc.y, size: 9, font: doc.font, color: doc.ink });
          doc.y -= 12;
        }
        if (a?.note) doc.paragraph(`Note: ${a.note}`, { indent: 36, size: 8, color: doc.muted });
        if (a && a.answer !== "no") await doc.imageRow(photos(a.photosJson), 80, 36);
      }
      doc.y -= 4;
    }
  }

  return doc.finish();
}
