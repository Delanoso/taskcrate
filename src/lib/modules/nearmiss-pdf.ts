import type { NearMissReport } from "@/generated/prisma/client";
import { createBrandedDocument, fmtDate, fmtDateTime, MARGIN, PAGE_W, fit, safe } from "@/lib/modules/pdf-kit";
import { serializeReport } from "@/lib/modules/nearmiss-server";
import { severityLabel, statusLabel, typeLabel } from "@/lib/modules/nearmiss-options";

export async function buildReportPdf(report: NearMissReport) {
  const r = serializeReport(report);
  const doc = await createBrandedDocument({
    organizationId: report.organizationId,
    title: `${typeLabel(r.reportType)} Report - ${r.reference}`,
    documentNumber: r.reference,
  });

  doc.heading("Report");
  doc.field("Reference", r.reference);
  doc.field("Type", typeLabel(r.reportType));
  doc.field("Category", r.category);
  doc.field("Location", r.locationHint);
  doc.field("Date of event", r.occurredAt ? fmtDate(new Date(r.occurredAt)) : null);
  doc.field("Reported", fmtDateTime(report.createdAt));
  doc.field("Potential severity", severityLabel(r.potentialSeverity));
  doc.field("Reported by", r.reporterName ? `${r.reporterName}${r.reporterContact ? ` (${r.reporterContact})` : ""}` : "Anonymous");
  doc.heading("What happened");
  doc.paragraph(r.description);
  if (r.immediateAction) {
    doc.y -= 4;
    doc.paragraph("Immediate action taken by reporter:", { font: doc.bold, size: 9 });
    doc.paragraph(r.immediateAction);
  }
  if (r.photos.length) {
    doc.y -= 6;
    await doc.imageRow(r.photos, 120);
  }

  doc.heading("Investigation & corrective action");
  doc.field("Status", statusLabel(r.status));
  doc.field("Risk rating", severityLabel(r.riskRating));
  doc.field("Responsible person", r.assignedTo);
  doc.field("Corrective action", r.correctiveAction);
  doc.field("Due date", r.dueDate ? fmtDate(new Date(`${r.dueDate}T12:00:00+02:00`)) : null);
  doc.field("Feedback to reporter", r.feedback);

  if (r.status === "closed") {
    doc.heading("Close-out");
    doc.field("Closed", r.closedAt ? fmtDateTime(new Date(r.closedAt)) : null);
    doc.field("Closed by", r.closedBy);
    doc.field("What was done", r.closeOutNote);
    if (r.closeOutPhotos.length) {
      doc.y -= 6;
      await doc.imageRow(r.closeOutPhotos, 120);
    }
  }
  return doc.finish();
}

type Count = [string, number];
const tally = (items: string[]): Count[] => {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

export async function buildRegisterPdf(organizationId: string, reports: NearMissReport[], periodLabel: string, documentNumber: string) {
  const rows = reports.map(serializeReport);
  const doc = await createBrandedDocument({ organizationId, title: `Near-Miss & Hazard Register - ${periodLabel}`, documentNumber });

  const closed = rows.filter((r) => r.status === "closed");
  const closeDays = closed
    .filter((r) => r.closedAt)
    .map((r) => (new Date(r.closedAt!).getTime() - new Date(r.createdAt).getTime()) / 86_400_000);
  doc.heading("Summary");
  doc.field("Period", periodLabel);
  doc.field("Reports", String(rows.length));
  doc.field("Still open", String(rows.filter((r) => r.status !== "closed").length));
  doc.field("Overdue actions", String(rows.filter((r) => r.overdue).length));
  doc.field("Closed", String(closed.length));
  doc.field("Average days to close", closeDays.length ? (closeDays.reduce((a, b) => a + b, 0) / closeDays.length).toFixed(1) : "-");

  const block = (title: string, counts: Count[]) => {
    doc.heading(title);
    if (!counts.length) doc.paragraph("None.", { color: doc.muted });
    for (const [k, n] of counts) doc.field(k, String(n), 220);
  };
  block("By type", tally(rows.map((r) => typeLabel(r.reportType))));
  block("By category", tally(rows.map((r) => r.category ?? "Not categorised")));
  block("By location", tally(rows.map((r) => r.locationHint ?? "Not given")));

  doc.addPage();
  doc.heading("Register");
  const cols = [
    { label: "Ref", w: 62 },
    { label: "Date", w: 58 },
    { label: "Type", w: 78 },
    { label: "Location", w: 85 },
    { label: "Description", w: 0 },
    { label: "Status", w: 62 },
  ];
  const fixed = cols.reduce((a, c) => a + c.w, 0);
  cols[4].w = PAGE_W - MARGIN * 2 - fixed;
  const drawRow = (cells: string[], bold = false) => {
    doc.ensure(16);
    let x = MARGIN;
    cells.forEach((c, i) => {
      const f = bold ? doc.bold : doc.font;
      doc.page.drawText(fit(safe(c), f, 8, cols[i].w - 4), { x, y: doc.y, size: 8, font: f, color: bold ? doc.primary : doc.ink });
      x += cols[i].w;
    });
    doc.y -= 13;
  };
  drawRow(cols.map((c) => c.label), true);
  if (!rows.length) doc.paragraph("No reports in this period.", { color: doc.muted });
  for (const r of rows) {
    drawRow([
      r.reference,
      fmtDate(new Date(r.createdAt)),
      typeLabel(r.reportType),
      r.locationHint ?? "-",
      r.description,
      `${statusLabel(r.status)}${r.overdue ? " (overdue)" : ""}`,
    ]);
  }
  return doc.finish();
}
