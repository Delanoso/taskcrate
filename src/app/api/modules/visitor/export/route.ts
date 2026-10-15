import { db } from "@/lib/db";
import { requireProductApi } from "@/lib/modules/api-guard";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx-write";

function when(d: Date | null) {
  if (!d) return "";
  return d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
}

export async function GET() {
  const gate = await requireProductApi("site-visitor");
  if ("error" in gate) return gate.error;
  const site = await db.visitorSite.findFirst({
    where: { organizationId: gate.session.organizationId },
    include: { visitors: { orderBy: { createdAt: "desc" }, take: 2000 } },
  });
  const rows = (site?.visitors ?? []).map((visitor) => [
    when(visitor.createdAt),
    when(visitor.checkedOutAt),
    visitor.fullName,
    visitor.company ?? "",
    visitor.hostName ?? "",
    visitor.purpose,
    visitor.phone,
    visitor.registration ?? "",
    visitor.checkedOutBy ?? (visitor.checkedOutAt ? "" : "Still on site"),
    visitor.signatureUrl ? "Signed" : "",
  ]);
  const bytes = buildXlsx({
    sheetName: "Visitors",
    headers: ["Arrived", "Left", "Name", "Company", "Visiting", "Purpose", "Phone", "Vehicle", "Checked out by", "Rules signed"],
    rows,
    widths: [22, 22, 24, 22, 22, 28, 16, 14, 18, 14],
  });
  return xlsxResponse(bytes, `${site?.name ?? "Visitors"} register`);
}
