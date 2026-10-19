import { requireProductApi } from "@/lib/modules/api-guard";
import { accidentSnapshot } from "@/lib/modules/accident";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi("accident-report");
  if ("error" in gate) return gate.error;
  const { reports } = await accidentSnapshot(gate.session.organizationId);
  const rows = reports.map((report) => [
    report.reportNumber,
    report.occurredAt.replace("T", " "),
    report.location,
    report.injuredName,
    report.employeeNumber ?? "",
    report.idNumber ?? "",
    report.jobTitle ?? "",
    report.activity,
    report.description,
    report.injury,
    report.treatment ?? "",
    report.witnesses ?? "",
    report.witnessName ?? "",
    report.actionTaken ?? "",
    report.reporterName,
  ]);
  const bytes = buildXlsx({
    sheetName: "Accidents",
    headers: [
      "Report",
      "Occurred",
      "Place",
      "Injured person",
      "Employee number",
      "ID number",
      "Job",
      "Doing",
      "What happened",
      "Injury",
      "Treatment",
      "Other witnesses",
      "Signing witness",
      "Action taken",
      "Filed by",
    ],
    rows,
    widths: [12, 18, 20, 22, 16, 16, 16, 24, 36, 24, 20, 24, 20, 28, 20],
  });
  return xlsxResponse(bytes, "Accident register");
}
