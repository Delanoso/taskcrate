import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { companyName, parseBody, saDateKey, staffName } from "@/lib/modules/common";
import { fillMerge } from "@/lib/modules/contract-library";
import { OPEN, SLUG, contentHashFor, newToken, normStatus, sendInput, serializeDoc, serializeTemplate } from "@/lib/modules/contract-server";
import { nextDocumentNumber } from "@/lib/modules/pdf-kit";
import { peopleDirectory } from "@/lib/modules/people";

export async function GET() {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const [docs, templates, directory, me] = await Promise.all([
    db.contractDocument.findMany({ where: { organizationId: orgId }, include: { template: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    db.contractTemplate.findMany({ where: { organizationId: orgId }, orderBy: [{ archived: "asc" }, { name: "asc" }] }),
    peopleDirectory(orgId),
    staffName(gate.session.userId),
  ]);

  const counts = new Map<string, { sent: number; completed: number; open: number }>();
  for (const d of docs) {
    if (!d.templateId) continue;
    const c = counts.get(d.templateId) ?? { sent: 0, completed: 0, open: 0 };
    const st = normStatus(d.status);
    if (st !== "voided") c.sent++;
    if (st === "completed") c.completed++;
    if (OPEN.includes(st) || st === "awaiting_countersign") c.open++;
    counts.set(d.templateId, c);
  }

  return NextResponse.json({
    company: await companyName(orgId),
    me,
    canManage: gate.access.role !== "MEMBER",
    templates: templates.map((t) => serializeTemplate(t, counts.get(t.id))),
    documents: docs.map(serializeDoc),
    directory,
  });
}

/** Sends a template (or a one-off text) to one or more people; each gets their own signing link. */
export async function POST(req: Request) {
  const gate = await requireProductApi(SLUG);
  if ("error" in gate) return gate.error;
  const orgId = gate.session.organizationId;
  const body = await parseBody(req, sendInput);
  if ("error" in body) return body.error;
  const b = body.data;

  let title: string;
  let text: string;
  let kind = "text";
  let sourceFileUrl: string | null = null;
  let pageCount: number | null = null;
  let requireCountersign = b.requireCountersign ?? false;
  let dueDate = b.dueDate || null;
  if (b.templateId) {
    const t = await db.contractTemplate.findFirst({ where: { id: b.templateId, organizationId: orgId } });
    if (!t) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    if (t.archived) return NextResponse.json({ error: "This template is archived. Restore it first." }, { status: 409 });
    title = t.name;
    text = t.bodyText;
    kind = t.kind;
    sourceFileUrl = t.fileUrl;
    pageCount = t.pageCount;
    requireCountersign = b.requireCountersign ?? t.requireCountersign;
    if (!dueDate && t.dueDays) dueDate = saDateKey(new Date(Date.now() + t.dueDays * 86_400_000));
  } else {
    title = b.title!;
    text = b.bodyText!;
  }

  const company = await companyName(orgId);
  const sentBy = await staffName(gate.session.userId);
  const batchId = b.recipients.length > 1 ? randomBytes(6).toString("hex") : null;
  const pdfHash = kind === "pdf" ? await contentHashFor("pdf", "", sourceFileUrl).catch(() => null) : null;
  if (kind === "pdf" && !pdfHash) return NextResponse.json({ error: "The template PDF is missing. Upload it again." }, { status: 409 });

  const created = [];
  for (const r of b.recipients) {
    const values = {
      ...b.fields,
      employee_name: r.name,
      employee_number: r.employeeNumber ?? "",
      job_title: r.jobTitle ?? b.fields.job_title ?? "",
      company,
      date: new Date().toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "long", year: "numeric" }),
    };
    const filled = kind === "text" ? fillMerge(text, values) : "";
    const doc = await db.contractDocument.create({
      data: {
        organizationId: orgId,
        templateId: b.templateId ?? null,
        reference: await nextDocumentNumber(orgId, "CS"),
        title,
        bodyText: filled,
        kind,
        sourceFileUrl,
        pageCount,
        contentHash: pdfHash ?? (await contentHashFor("text", filled, null)),
        publicToken: newToken(),
        employeeName: r.name,
        employeePhone: r.phone || null,
        employeeEmail: r.email || null,
        employeeNumber: r.employeeNumber || null,
        jobTitle: r.jobTitle || null,
        batchId,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:00+02:00`) : null,
        requireCountersign,
        sentBy,
      },
      include: { template: { select: { name: true } } },
    });
    created.push(serializeDoc(doc));
  }
  return NextResponse.json({ documents: created });
}
