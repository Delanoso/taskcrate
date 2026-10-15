import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

function when(d: Date) {
  return d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
}

export async function GET() {
  const gate = await requireProductApi("fit-for-duty");
  if ("error" in gate) return gate.error;
  const checks = await db.fitForDutyCheck.findMany({
    where: { site: { organizationId: gate.session.organizationId } },
    include: { site: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const rows = checks.map((check) => {
    let ppe = check.ppeConfirmed ? "All passed" : "Failed";
    try {
      const parsed = JSON.parse(check.ppeJson ?? "[]") as { label: string; pass: boolean }[];
      if (Array.isArray(parsed) && parsed.length) {
        ppe = parsed.map((item) => `${item.label}: ${item.pass ? "Pass" : "Fail"}`).join("; ");
      }
    } catch {
      /* older rows have no checklist */
    }
    return [
      when(check.createdAt),
      check.site.name,
      check.employeeName,
      check.employeeNumber ?? "",
      check.status === "VERIFIED_READY" ? "Ready" : "Not cleared",
      check.reactionMs,
      ppe,
      check.note ?? "",
      check.signatureUrl ? "Signed" : "",
    ];
  });
  const bytes = buildXlsx({
    sheetName: "Fit for duty",
    headers: ["Time", "Gate", "Name", "Employee number", "Result", "Reaction ms", "PPE", "Note", "Signed"],
    rows,
    widths: [22, 20, 24, 16, 14, 14, 42, 28, 12],
  });
  return xlsxResponse(bytes, "Fit for duty register");
}
