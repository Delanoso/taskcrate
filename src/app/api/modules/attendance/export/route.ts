import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { formatWhen } from "@/lib/modules/attendance";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

export async function GET() {
  const gate = await requireProductApi("site-attendance");
  if ("error" in gate) return gate.error;
  const sites = await db.attendanceSite.findMany({
    where: { organizationId: gate.session.organizationId },
    include: { punches: { orderBy: { createdAt: "desc" } } },
    orderBy: { name: "asc" },
  });
  const rows = sites.flatMap((site) =>
    site.punches.map((punch) => [
      formatWhen(punch.createdAt),
      site.name,
      site.location ?? "",
      punch.direction === "IN" ? "In" : "Out",
      punch.fullName,
      punch.employeeNumber ?? "",
      punch.note ?? "",
    ]),
  );
  const bytes = buildXlsx({
    sheetName: "Attendance",
    headers: ["Time", "Site", "Location", "Direction", "Name", "Employee number", "Note"],
    rows,
    widths: [22, 22, 22, 12, 24, 16, 28],
  });
  return xlsxResponse(bytes, "Site attendance");
}
