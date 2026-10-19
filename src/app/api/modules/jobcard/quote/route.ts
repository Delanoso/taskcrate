import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { BillingError, quoteFromJobCard } from "@/lib/modules/billing";
import { parseParts } from "@/lib/modules/jobcard-shared";
import { canAccessProduct } from "@/lib/rbac";

export async function POST(req: Request) {
  const body = z.object({
    id: z.string(),
    mode: z.enum(["internal", "field"]),
    hourlyRate: z.number().min(0).max(100_000),
    clientName: z.string().trim().min(2).max(160),
    clientEmail: z.string().trim().max(120).optional().or(z.literal("")),
    clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
  }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Check the quote details" }, { status: 400 });

  const slug = body.data.mode === "field" ? "job-card-field" : "job-card-internal";
  const gate = await requireProductApi(slug);
  if ("error" in gate) return gate.error;
  if (!canAccessProduct(gate.access, "quotations")) {
    return NextResponse.json({
      error: "Add Quotations and Invoicing to turn this job into a quote. The job card stays closed either way.",
    }, { status: 403 });
  }

  const job = await db.jobCard.findFirst({
    where: { id: body.data.id, organizationId: gate.session.organizationId, mode: body.data.mode },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "done") return NextResponse.json({ error: "Close the job card first." }, { status: 400 });

  try {
    const quote = await quoteFromJobCard(gate.session.organizationId, {
      jobNumber: job.jobNumber ?? `JC-${job.id.slice(-4).toUpperCase()}`,
      title: job.title,
      hours: job.hoursWorked,
      hourlyRate: body.data.hourlyRate,
      parts: parseParts(job.partsJson),
      clientName: body.data.clientName,
      clientEmail: body.data.clientEmail,
      clientPhone: body.data.clientPhone,
      existingQuoteId: job.quoteDocumentId,
    });
    if (job.quoteDocumentId !== quote.id) {
      await db.jobCard.update({ where: { id: job.id }, data: { quoteDocumentId: quote.id } });
    }
    return NextResponse.json({ number: quote.number, id: quote.id });
  } catch (error) {
    if (error instanceof BillingError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
